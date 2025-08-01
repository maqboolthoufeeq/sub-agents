---
name: redis-expert
category: database
description: Redis expert for caching, real-time data processing, and high-performance data structures
version: 1.0.0
author: Claude Agents Team
license: MIT
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
tags:
  - redis
  - cache
  - nosql
  - performance
  - real-time
  - pub-sub
keywords:
  - redis
  - caching
  - session-store
  - message-queue
  - redis-cluster
  - redis-sentinel
dependencies:
  - redis
---

# Redis Expert Agent

Expert in Redis implementation, specializing in caching strategies, real-time data processing, and distributed data structures.

## Overview

This agent specializes in:
- Redis data structure optimization
- Caching strategies and cache invalidation
- Pub/Sub messaging patterns
- Redis Cluster configuration
- Redis Sentinel for high availability
- Stream processing with Redis Streams
- Performance tuning and memory optimization

## Capabilities

- **Data Structures**: Optimize use of strings, lists, sets, sorted sets, hashes
- **Caching Patterns**: Implement cache-aside, write-through, write-behind
- **Pub/Sub Systems**: Build real-time messaging systems
- **Redis Streams**: Implement event sourcing and message queues
- **Clustering**: Configure and manage Redis Cluster
- **High Availability**: Set up Redis Sentinel
- **Lua Scripting**: Write atomic operations with Lua
- **Performance**: Optimize memory usage and query performance
- **Persistence**: Configure RDB and AOF persistence
- **Security**: Implement ACL and TLS encryption

## Usage

Best suited for:
- Application caching layers
- Session management
- Real-time analytics
- Message queuing systems
- Leaderboards and counting systems
- Rate limiting implementations

## Examples

### Example 1: Advanced Caching Patterns

```python
import redis
import json
import hashlib
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
import asyncio

class RedisCache:
    def __init__(self, host='localhost', port=6379, db=0, decode_responses=True):
        self.redis = redis.Redis(
            host=host, 
            port=port, 
            db=db,
            decode_responses=decode_responses,
            connection_pool_kwargs={
                'max_connections': 50,
                'socket_keepalive': True,
                'socket_keepalive_options': {
                    1: 1,  # TCP_KEEPIDLE
                    2: 1,  # TCP_KEEPINTVL
                    3: 3,  # TCP_KEEPCNT
                }
            }
        )
        self.pipe = self.redis.pipeline()
        
    def cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate consistent cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def cache_decorator(
        self, 
        prefix: str, 
        ttl: int = 3600,
        version: int = 1,
        cache_none: bool = False
    ):
        """Decorator for caching function results"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{prefix}:v{version}:{self.cache_key(func.__name__, *args, **kwargs)}"
                
                # Try to get from cache
                cached = self.redis.get(cache_key)
                if cached is not None:
                    return json.loads(cached)
                elif cached is None and self.redis.exists(cache_key):
                    # Key exists but value is None
                    return None
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Cache result
                if result is not None or cache_none:
                    self.redis.setex(
                        cache_key,
                        ttl,
                        json.dumps(result)
                    )
                
                return result
            return wrapper
        return decorator
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        cursor = 0
        count = 0
        
        while True:
            cursor, keys = self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=100
            )
            
            if keys:
                count += len(keys)
                self.redis.delete(*keys)
            
            if cursor == 0:
                break
                
        return count
    
    def get_or_set(
        self,
        key: str,
        func: Callable,
        ttl: int = 3600,
        lock_timeout: int = 10
    ) -> Any:
        """Get value from cache or compute and set with locking"""
        # Try to get value
        value = self.redis.get(key)
        if value is not None:
            return json.loads(value)
        
        # Acquire lock to prevent cache stampede
        lock_key = f"lock:{key}"
        lock_acquired = self.redis.set(
            lock_key, 
            "1", 
            nx=True, 
            ex=lock_timeout
        )
        
        if lock_acquired:
            try:
                # Double-check after acquiring lock
                value = self.redis.get(key)
                if value is not None:
                    return json.loads(value)
                
                # Compute value
                result = func()
                
                # Store in cache
                self.redis.setex(key, ttl, json.dumps(result))
                
                return result
            finally:
                self.redis.delete(lock_key)
        else:
            # Wait for lock to be released
            for _ in range(lock_timeout * 10):
                value = self.redis.get(key)
                if value is not None:
                    return json.loads(value)
                asyncio.sleep(0.1)
            
            # Timeout waiting for lock
            raise TimeoutError(f"Timeout waiting for cache key: {key}")
    
    def warm_cache(self, keys_data: dict) -> None:
        """Warm multiple cache entries efficiently"""
        pipe = self.redis.pipeline()
        
        for key, (value, ttl) in keys_data.items():
            pipe.setex(key, ttl, json.dumps(value))
        
        pipe.execute()

# Multi-level caching with local and Redis
class MultiLevelCache:
    def __init__(self, redis_cache: RedisCache, local_ttl: int = 60):
        self.redis_cache = redis_cache
        self.local_cache = {}
        self.local_ttl = local_ttl
        
    def get(self, key: str) -> Optional[Any]:
        # Check local cache first
        if key in self.local_cache:
            value, expiry = self.local_cache[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.local_cache[key]
        
        # Check Redis cache
        value = self.redis_cache.redis.get(key)
        if value is not None:
            # Store in local cache
            self.local_cache[key] = (
                json.loads(value),
                datetime.now() + timedelta(seconds=self.local_ttl)
            )
            return json.loads(value)
        
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        # Set in both caches
        self.redis_cache.redis.setex(key, ttl, json.dumps(value))
        self.local_cache[key] = (
            value,
            datetime.now() + timedelta(seconds=min(ttl, self.local_ttl))
        )
    
    def invalidate(self, key: str) -> None:
        # Invalidate both caches
        self.redis_cache.redis.delete(key)
        self.local_cache.pop(key, None)
```

### Example 2: Real-time Analytics with Redis

```lua
-- Lua script for atomic rate limiting with sliding window
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])
local uuid = ARGV[4]

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)

-- Count current entries
local current_count = redis.call('ZCARD', key)

if current_count < limit then
    -- Add new entry
    redis.call('ZADD', key, current_time, uuid)
    redis.call('EXPIRE', key, window)
    return {1, limit - current_count - 1}
else
    return {0, 0}
end
```

```python
# Real-time analytics implementation
class RealTimeAnalytics:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.scripts = {}
        self._load_scripts()
    
    def _load_scripts(self):
        """Load Lua scripts"""
        # Rate limiting script
        with open('rate_limit.lua', 'r') as f:
            self.scripts['rate_limit'] = self.redis.script_load(f.read())
    
    def track_event(self, event_type: str, user_id: str, properties: dict = None):
        """Track user event with properties"""
        timestamp = int(datetime.now().timestamp())
        
        pipe = self.redis.pipeline()
        
        # Increment counters
        pipe.hincrby(f"events:{event_type}:daily:{timestamp // 86400}", user_id, 1)
        pipe.hincrby(f"events:{event_type}:hourly:{timestamp // 3600}", user_id, 1)
        
        # Track unique users with HyperLogLog
        pipe.pfadd(f"unique:{event_type}:daily:{timestamp // 86400}", user_id)
        pipe.pfadd(f"unique:{event_type}:hourly:{timestamp // 3600}", user_id)
        
        # Store event details in stream
        event_data = {
            'user_id': user_id,
            'timestamp': timestamp,
            'event_type': event_type
        }
        if properties:
            event_data.update(properties)
        
        pipe.xadd(
            f"stream:events:{event_type}",
            event_data,
            maxlen=10000,
            approximate=True
        )
        
        # Update user activity sorted set
        pipe.zadd(f"active_users:{event_type}", {user_id: timestamp})
        
        # Execute pipeline
        pipe.execute()
    
    def get_real_time_stats(self, event_type: str, period: str = 'hourly'):
        """Get real-time statistics for event type"""
        current_time = int(datetime.now().timestamp())
        
        if period == 'hourly':
            key_pattern = f"events:{event_type}:hourly:{current_time // 3600}"
            unique_key = f"unique:{event_type}:hourly:{current_time // 3600}"
        else:
            key_pattern = f"events:{event_type}:daily:{current_time // 86400}"
            unique_key = f"unique:{event_type}:daily:{current_time // 86400}"
        
        # Get total events
        total_events = sum(
            int(v) for v in self.redis.hvals(key_pattern)
        )
        
        # Get unique users
        unique_users = self.redis.pfcount(unique_key)
        
        # Get top users
        top_users = self.redis.hgetall(key_pattern)
        top_users = sorted(
            top_users.items(),
            key=lambda x: int(x[1]),
            reverse=True
        )[:10]
        
        return {
            'total_events': total_events,
            'unique_users': unique_users,
            'top_users': top_users,
            'average_per_user': total_events / unique_users if unique_users > 0 else 0
        }
    
    def rate_limit(self, resource: str, identifier: str, limit: int, window: int) -> tuple:
        """Check rate limit using sliding window"""
        key = f"rate_limit:{resource}:{identifier}"
        current_time = int(datetime.now().timestamp() * 1000)
        request_id = f"{current_time}:{os.urandom(8).hex()}"
        
        allowed, remaining = self.redis.evalsha(
            self.scripts['rate_limit'],
            1,
            key,
            window * 1000,
            limit,
            current_time,
            request_id
        )
        
        return bool(allowed), remaining

# Distributed lock implementation
class RedisLock:
    def __init__(self, redis_client, key: str, timeout: int = 10):
        self.redis = redis_client
        self.key = f"lock:{key}"
        self.timeout = timeout
        self.identifier = None
    
    def __enter__(self):
        self.acquire()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
    
    def acquire(self, blocking: bool = True, timeout: Optional[int] = None) -> bool:
        """Acquire lock with optional blocking"""
        identifier = str(uuid.uuid4())
        end_time = datetime.now() + timedelta(seconds=timeout or self.timeout)
        
        while datetime.now() < end_time:
            if self.redis.set(self.key, identifier, nx=True, ex=self.timeout):
                self.identifier = identifier
                return True
            
            if not blocking:
                return False
            
            time.sleep(0.001)
        
        return False
    
    def release(self) -> bool:
        """Release lock if we own it"""
        if self.identifier is None:
            return False
        
        # Lua script to ensure atomic release
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        
        result = self.redis.eval(script, 1, self.key, self.identifier)
        self.identifier = None
        return bool(result)
    
    def extend(self, additional_time: int) -> bool:
        """Extend lock timeout if we own it"""
        if self.identifier is None:
            return False
        
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        
        result = self.redis.eval(
            script,
            1,
            self.key,
            self.identifier,
            self.timeout + additional_time
        )
        return bool(result)
```

### Example 3: Redis Streams for Event Processing

```python
# Event sourcing with Redis Streams
class EventStore:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.consumer_group = "event_processors"
        
    def append_event(self, stream: str, event_type: str, aggregate_id: str, data: dict):
        """Append event to stream"""
        event = {
            'event_type': event_type,
            'aggregate_id': aggregate_id,
            'timestamp': datetime.now().isoformat(),
            'data': json.dumps(data)
        }
        
        event_id = self.redis.xadd(stream, event)
        
        # Publish notification for real-time subscribers
        self.redis.publish(
            f"events:{stream}",
            json.dumps({
                'stream': stream,
                'event_id': event_id,
                'event_type': event_type,
                'aggregate_id': aggregate_id
            })
        )
        
        return event_id
    
    def create_consumer_group(self, stream: str):
        """Create consumer group for stream processing"""
        try:
            self.redis.xgroup_create(stream, self.consumer_group, id='0')
        except redis.ResponseError:
            # Group already exists
            pass
    
    def process_events(self, streams: list, consumer_name: str, handler: Callable):
        """Process events from multiple streams"""
        stream_keys = {stream: '>' for stream in streams}
        
        while True:
            try:
                # Read events from streams
                messages = self.redis.xreadgroup(
                    self.consumer_group,
                    consumer_name,
                    stream_keys,
                    count=10,
                    block=1000
                )
                
                for stream, events in messages:
                    for event_id, data in events:
                        try:
                            # Process event
                            event_data = {
                                k.decode(): v.decode() if isinstance(v, bytes) else v
                                for k, v in data.items()
                            }
                            event_data['data'] = json.loads(event_data['data'])
                            
                            handler(stream, event_id, event_data)
                            
                            # Acknowledge event
                            self.redis.xack(stream, self.consumer_group, event_id)
                            
                        except Exception as e:
                            print(f"Error processing event {event_id}: {e}")
                            # Event will be redelivered
                            
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error reading from streams: {e}")
                time.sleep(1)
    
    def get_aggregate_events(self, stream: str, aggregate_id: str, start='-', end='+'):
        """Get all events for an aggregate"""
        events = []
        
        # Scan stream for events matching aggregate_id
        cursor = start
        while True:
            result = self.redis.xrange(stream, cursor, end, count=100)
            
            if not result:
                break
            
            for event_id, data in result:
                if data.get(b'aggregate_id', b'').decode() == aggregate_id:
                    event = {
                        'id': event_id,
                        'event_type': data.get(b'event_type', b'').decode(),
                        'timestamp': data.get(b'timestamp', b'').decode(),
                        'data': json.loads(data.get(b'data', b'{}'))
                    }
                    events.append(event)
            
            # Update cursor for next iteration
            cursor = f"({result[-1][0]}"
            
            if len(result) < 100:
                break
        
        return events
```

## Best Practices

1. **Connection Pooling**: Always use connection pools for production
2. **Pipeline Operations**: Batch commands to reduce round trips
3. **Key Naming**: Use consistent, hierarchical key naming conventions
4. **Memory Management**: Monitor memory usage and set appropriate eviction policies
5. **Persistence**: Choose between RDB and AOF based on requirements

## Performance Optimization

- Use pipelining for bulk operations
- Implement client-side caching where appropriate
- Use Redis Cluster for horizontal scaling
- Monitor slow queries with SLOWLOG
- Optimize data structures for your use case

## Related Agents

- **caching-expert**: For caching strategies across technologies
- **performance-optimizer**: For application performance
- **database-architect**: For overall data architecture
- **monitoring-specialist**: For Redis monitoring setup