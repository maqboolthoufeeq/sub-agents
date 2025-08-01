---
name: senior-software-engineer
category: generic
description: Senior software engineer with expertise in system design, code quality, and technical leadership
version: 1.0.0
author: Claude Agents Team
license: MIT
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - WebFetch
tags:
  - software-engineering
  - architecture
  - best-practices
  - code-review
  - mentoring
  - leadership
keywords:
  - software-design
  - clean-code
  - design-patterns
  - refactoring
  - testing
  - documentation
---

# Senior Software Engineer Agent

Expert senior software engineer specializing in system design, code quality, technical leadership, and delivering scalable software solutions.

## Overview

This agent specializes in:
- Software architecture and system design
- Code quality and best practices
- Design patterns and principles
- Code reviews and refactoring
- Technical mentoring and leadership
- Performance optimization
- Testing strategies
- Documentation and knowledge sharing

## Capabilities

- **System Design**: Design scalable, maintainable software architectures
- **Code Review**: Provide thorough, constructive code reviews
- **Refactoring**: Improve code quality while maintaining functionality
- **Design Patterns**: Apply appropriate patterns to solve problems
- **Testing Strategy**: Design comprehensive testing approaches
- **Performance**: Identify and resolve performance bottlenecks
- **Documentation**: Create clear technical documentation
- **Mentoring**: Guide junior developers and share knowledge
- **Best Practices**: Establish and enforce coding standards
- **Technical Debt**: Identify and plan technical debt reduction

## Usage

Best suited for:
- Software architecture design
- Code quality improvement
- Technical decision making
- Team leadership and mentoring
- Performance optimization
- Legacy code modernization

## Examples

### Example 1: System Design - Event-Driven Microservices

```python
"""
Event-Driven E-commerce System Architecture

This example demonstrates a scalable microservices architecture
with proper separation of concerns, error handling, and observability.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from enum import Enum
import json
import asyncio
import logging
from functools import wraps
import uuid

# Domain Events
@dataclass
class DomainEvent:
    """Base class for all domain events"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = field(init=False)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    aggregate_id: str = ""
    aggregate_type: str = ""
    version: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.event_type = self.__class__.__name__

@dataclass
class OrderPlaced(DomainEvent):
    """Event raised when an order is placed"""
    customer_id: str = ""
    items: List[Dict[str, Any]] = field(default_factory=list)
    total_amount: float = 0.0
    
@dataclass
class PaymentProcessed(DomainEvent):
    """Event raised when payment is processed"""
    order_id: str = ""
    payment_method: str = ""
    amount: float = 0.0
    transaction_id: str = ""

@dataclass
class InventoryReserved(DomainEvent):
    """Event raised when inventory is reserved"""
    order_id: str = ""
    reservations: List[Dict[str, Any]] = field(default_factory=list)

# Event Bus Interface
class EventBus(ABC):
    """Abstract event bus interface"""
    
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        """Publish an event to the bus"""
        pass
    
    @abstractmethod
    async def subscribe(self, event_type: str, handler: Callable) -> None:
        """Subscribe to events of a specific type"""
        pass

# In-Memory Event Bus Implementation
class InMemoryEventBus(EventBus):
    """Simple in-memory event bus for demonstration"""
    
    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}
        self._middleware: List[Callable] = []
        self.logger = logging.getLogger(__name__)
    
    def add_middleware(self, middleware: Callable) -> None:
        """Add middleware for event processing"""
        self._middleware.append(middleware)
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish event to all registered handlers"""
        # Apply middleware
        for middleware in self._middleware:
            event = await middleware(event)
        
        handlers = self._handlers.get(event.event_type, [])
        
        # Execute handlers concurrently
        tasks = [handler(event) for handler in handlers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(
                    f"Handler {handlers[i].__name__} failed for event {event.event_type}: {result}"
                )
    
    async def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register a handler for an event type"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

# Saga Pattern Implementation
class SagaStep:
    """Represents a step in a saga"""
    
    def __init__(
        self,
        name: str,
        action: Callable,
        compensation: Callable,
        retry_policy: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.action = action
        self.compensation = compensation
        self.retry_policy = retry_policy or {"max_attempts": 3, "delay": 1}

class Saga:
    """Saga orchestrator for distributed transactions"""
    
    def __init__(self, name: str, event_bus: EventBus):
        self.name = name
        self.steps: List[SagaStep] = []
        self.event_bus = event_bus
        self.logger = logging.getLogger(f"Saga.{name}")
    
    def add_step(self, step: SagaStep) -> 'Saga':
        """Add a step to the saga"""
        self.steps.append(step)
        return self
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the saga with automatic compensation on failure"""
        completed_steps = []
        
        try:
            for step in self.steps:
                self.logger.info(f"Executing step: {step.name}")
                
                # Execute with retry
                result = await self._execute_with_retry(
                    step.action,
                    context,
                    step.retry_policy
                )
                
                completed_steps.append(step)
                context[f"{step.name}_result"] = result
                
                # Publish step completed event
                await self.event_bus.publish(
                    DomainEvent(
                        aggregate_id=context.get("saga_id", ""),
                        aggregate_type="Saga",
                        metadata={
                            "saga_name": self.name,
                            "step_name": step.name,
                            "status": "completed"
                        }
                    )
                )
        
        except Exception as e:
            self.logger.error(f"Saga failed at step {step.name}: {e}")
            
            # Compensate in reverse order
            for completed_step in reversed(completed_steps):
                try:
                    self.logger.info(f"Compensating step: {completed_step.name}")
                    await completed_step.compensation(context)
                except Exception as comp_error:
                    self.logger.error(
                        f"Compensation failed for step {completed_step.name}: {comp_error}"
                    )
            
            raise SagaException(f"Saga {self.name} failed: {e}")
        
        return context
    
    async def _execute_with_retry(
        self,
        func: Callable,
        context: Dict[str, Any],
        retry_policy: Dict[str, Any]
    ) -> Any:
        """Execute function with retry policy"""
        max_attempts = retry_policy["max_attempts"]
        delay = retry_policy["delay"]
        
        for attempt in range(max_attempts):
            try:
                return await func(context)
            except Exception as e:
                if attempt == max_attempts - 1:
                    raise
                
                self.logger.warning(
                    f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
                delay *= 2  # Exponential backoff

class SagaException(Exception):
    """Exception raised when a saga fails"""
    pass

# Repository Pattern with Unit of Work
class Repository(ABC):
    """Abstract repository interface"""
    
    @abstractmethod
    async def find_by_id(self, id: str) -> Optional[Any]:
        pass
    
    @abstractmethod
    async def save(self, entity: Any) -> None:
        pass
    
    @abstractmethod
    async def delete(self, id: str) -> None:
        pass

class UnitOfWork(ABC):
    """Abstract unit of work interface"""
    
    @abstractmethod
    async def __aenter__(self):
        pass
    
    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    @abstractmethod
    async def commit(self) -> None:
        pass
    
    @abstractmethod
    async def rollback(self) -> None:
        pass

# Service Layer with Dependency Injection
class OrderService:
    """Order service with proper separation of concerns"""
    
    def __init__(
        self,
        order_repository: Repository,
        inventory_service: 'InventoryService',
        payment_service: 'PaymentService',
        event_bus: EventBus,
        unit_of_work: UnitOfWork
    ):
        self.order_repository = order_repository
        self.inventory_service = inventory_service
        self.payment_service = payment_service
        self.event_bus = event_bus
        self.unit_of_work = unit_of_work
        self.logger = logging.getLogger(__name__)
    
    async def place_order(self, order_data: Dict[str, Any]) -> str:
        """Place an order using saga pattern"""
        saga = Saga("PlaceOrder", self.event_bus)
        
        # Define saga steps
        saga.add_step(SagaStep(
            name="validate_order",
            action=self._validate_order,
            compensation=self._cancel_order_validation
        ))
        
        saga.add_step(SagaStep(
            name="reserve_inventory",
            action=self._reserve_inventory,
            compensation=self._release_inventory
        ))
        
        saga.add_step(SagaStep(
            name="process_payment",
            action=self._process_payment,
            compensation=self._refund_payment
        ))
        
        saga.add_step(SagaStep(
            name="confirm_order",
            action=self._confirm_order,
            compensation=self._cancel_order
        ))
        
        # Execute saga
        context = {
            "order_data": order_data,
            "saga_id": str(uuid.uuid4())
        }
        
        try:
            result = await saga.execute(context)
            return result["order_id"]
        except SagaException as e:
            self.logger.error(f"Order placement failed: {e}")
            raise
    
    async def _validate_order(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate order data"""
        order_data = context["order_data"]
        
        # Validation logic
        if not order_data.get("items"):
            raise ValueError("Order must contain at least one item")
        
        if not order_data.get("customer_id"):
            raise ValueError("Customer ID is required")
        
        # Calculate total
        total = sum(
            item["price"] * item["quantity"]
            for item in order_data["items"]
        )
        
        return {
            "validated": True,
            "total_amount": total
        }
    
    async def _reserve_inventory(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Reserve inventory for order items"""
        items = context["order_data"]["items"]
        
        reservations = await self.inventory_service.reserve_items(items)
        
        # Publish event
        await self.event_bus.publish(
            InventoryReserved(
                aggregate_id=context["saga_id"],
                order_id=context.get("order_id", ""),
                reservations=reservations
            )
        )
        
        return {"reservations": reservations}
    
    async def _process_payment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process payment for the order"""
        total_amount = context["validate_order_result"]["total_amount"]
        payment_method = context["order_data"].get("payment_method", "credit_card")
        
        transaction_id = await self.payment_service.process_payment(
            amount=total_amount,
            method=payment_method,
            customer_id=context["order_data"]["customer_id"]
        )
        
        # Publish event
        await self.event_bus.publish(
            PaymentProcessed(
                aggregate_id=context["saga_id"],
                order_id=context.get("order_id", ""),
                payment_method=payment_method,
                amount=total_amount,
                transaction_id=transaction_id
            )
        )
        
        return {"transaction_id": transaction_id}
    
    async def _confirm_order(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Confirm and save the order"""
        order_id = str(uuid.uuid4())
        
        order = {
            "id": order_id,
            "customer_id": context["order_data"]["customer_id"],
            "items": context["order_data"]["items"],
            "total_amount": context["validate_order_result"]["total_amount"],
            "transaction_id": context["process_payment_result"]["transaction_id"],
            "status": "confirmed",
            "created_at": datetime.utcnow()
        }
        
        async with self.unit_of_work:
            await self.order_repository.save(order)
            await self.unit_of_work.commit()
        
        # Publish event
        await self.event_bus.publish(
            OrderPlaced(
                aggregate_id=order_id,
                aggregate_type="Order",
                customer_id=order["customer_id"],
                items=order["items"],
                total_amount=order["total_amount"]
            )
        )
        
        context["order_id"] = order_id
        return {"order_id": order_id}
    
    # Compensation methods
    async def _cancel_order_validation(self, context: Dict[str, Any]) -> None:
        """Compensation for order validation"""
        self.logger.info("Cancelling order validation")
    
    async def _release_inventory(self, context: Dict[str, Any]) -> None:
        """Release reserved inventory"""
        if "reserve_inventory_result" in context:
            reservations = context["reserve_inventory_result"]["reservations"]
            await self.inventory_service.release_reservations(reservations)
    
    async def _refund_payment(self, context: Dict[str, Any]) -> None:
        """Refund processed payment"""
        if "process_payment_result" in context:
            transaction_id = context["process_payment_result"]["transaction_id"]
            await self.payment_service.refund_transaction(transaction_id)
    
    async def _cancel_order(self, context: Dict[str, Any]) -> None:
        """Cancel confirmed order"""
        if "order_id" in context:
            async with self.unit_of_work:
                await self.order_repository.delete(context["order_id"])
                await self.unit_of_work.commit()

# Circuit Breaker Pattern
class CircuitBreakerState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """Circuit breaker for fault tolerance"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED
    
    def __call__(self, func):
        """Decorator for circuit breaker"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == CircuitBreakerState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitBreakerState.HALF_OPEN
                else:
                    raise Exception("Circuit breaker is OPEN")
            
            try:
                result = await func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        return (
            self.last_failure_time and
            datetime.utcnow().timestamp() - self.last_failure_time > self.recovery_timeout
        )
    
    def _on_success(self) -> None:
        """Handle successful call"""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED
    
    def _on_failure(self) -> None:
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow().timestamp()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN

# Observability and Monitoring
class MetricsCollector:
    """Collect and expose metrics"""
    
    def __init__(self):
        self._metrics: Dict[str, Any] = {}
        self._lock = asyncio.Lock()
    
    async def increment(self, metric: str, value: float = 1) -> None:
        """Increment a counter metric"""
        async with self._lock:
            if metric not in self._metrics:
                self._metrics[metric] = 0
            self._metrics[metric] += value
    
    async def record(self, metric: str, value: float) -> None:
        """Record a gauge metric"""
        async with self._lock:
            self._metrics[metric] = value
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics"""
        async with self._lock:
            return self._metrics.copy()

def trace(span_name: str):
    """Decorator for distributed tracing"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            trace_id = str(uuid.uuid4())
            span_id = str(uuid.uuid4())
            
            logger = logging.getLogger(func.__module__)
            logger.info(
                f"Starting span",
                extra={
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "span_name": span_name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            start_time = datetime.utcnow()
            
            try:
                result = await func(*args, **kwargs)
                duration = (datetime.utcnow() - start_time).total_seconds()
                
                logger.info(
                    f"Completed span",
                    extra={
                        "trace_id": trace_id,
                        "span_id": span_id,
                        "span_name": span_name,
                        "duration_seconds": duration,
                        "status": "success"
                    }
                )
                
                return result
            
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds()
                
                logger.error(
                    f"Failed span",
                    extra={
                        "trace_id": trace_id,
                        "span_id": span_id,
                        "span_name": span_name,
                        "duration_seconds": duration,
                        "status": "error",
                        "error": str(e)
                    }
                )
                
                raise
        
        return wrapper
    return decorator
```

### Example 2: Code Review Best Practices

```python
"""
Code Review Example: Refactoring a poorly written service

This example shows how to identify issues and provide constructive feedback
during code review, along with refactored solutions.
"""

# ===== ORIGINAL CODE (with issues) =====
class UserService:
    def get_user_data(self, id):
        # Issue 1: No input validation
        # Issue 2: Direct database access in service layer
        # Issue 3: No error handling
        # Issue 4: SQL injection vulnerability
        import mysql.connector
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="password",  # Issue 5: Hardcoded credentials
            database="users"
        )
        cursor = conn.cursor()
        
        # Issue 6: SQL injection vulnerability
        query = f"SELECT * FROM users WHERE id = {id}"
        cursor.execute(query)
        result = cursor.fetchone()
        
        # Issue 7: No resource cleanup
        # Issue 8: Returning raw database row
        return result
    
    def update_user(self, data):
        # Issue 9: No validation of data structure
        # Issue 10: Catching all exceptions
        try:
            # Issue 11: Mixing business logic with data access
            if data['age'] < 0:
                data['age'] = 0
            
            # Issue 12: No transaction management
            # ... database update code ...
            
            # Issue 13: Print statements instead of logging
            print(f"User updated: {data}")
            
            return True
        except:  # Issue 14: Bare except clause
            return False

# ===== REFACTORED CODE (with improvements) =====

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
from contextlib import contextmanager
import os
from functools import lru_cache

# Domain Models
@dataclass
class User:
    """User domain model with validation"""
    id: str
    email: str
    name: str
    age: int
    created_at: datetime
    updated_at: datetime
    
    def __post_init__(self):
        """Validate user data after initialization"""
        if self.age < 0:
            raise ValueError("Age cannot be negative")
        
        if not self._is_valid_email(self.email):
            raise ValueError(f"Invalid email format: {self.email}")
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

# Repository Interface (Dependency Inversion)
class UserRepository(ABC):
    """Abstract repository interface for user data access"""
    
    @abstractmethod
    async def find_by_id(self, user_id: str) -> Optional[User]:
        """Find user by ID"""
        pass
    
    @abstractmethod
    async def save(self, user: User) -> None:
        """Save or update user"""
        pass
    
    @abstractmethod
    async def delete(self, user_id: str) -> None:
        """Delete user by ID"""
        pass
    
    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        pass

# Database Configuration
@dataclass
class DatabaseConfig:
    """Database configuration with environment variable support"""
    host: str = os.getenv("DB_HOST", "localhost")
    port: int = int(os.getenv("DB_PORT", "5432"))
    user: str = os.getenv("DB_USER", "")
    password: str = os.getenv("DB_PASSWORD", "")
    database: str = os.getenv("DB_NAME", "")
    
    def __post_init__(self):
        """Validate required configuration"""
        if not all([self.user, self.password, self.database]):
            raise ValueError("Missing required database configuration")

# Connection Pool Manager
class DatabaseConnectionPool:
    """Manages database connections with pooling"""
    
    def __init__(self, config: DatabaseConfig, pool_size: int = 10):
        self.config = config
        self.pool_size = pool_size
        self._pool = None
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the connection pool"""
        import asyncpg
        
        self._pool = await asyncpg.create_pool(
            host=self.config.host,
            port=self.config.port,
            user=self.config.user,
            password=self.config.password,
            database=self.config.database,
            min_size=2,
            max_size=self.pool_size,
            command_timeout=60
        )
        
        self.logger.info(f"Database pool initialized with {self.pool_size} connections")
    
    @contextmanager
    async def acquire(self):
        """Acquire a connection from the pool"""
        if not self._pool:
            raise RuntimeError("Connection pool not initialized")
        
        connection = await self._pool.acquire()
        try:
            yield connection
        finally:
            await self._pool.release(connection)
    
    async def close(self):
        """Close the connection pool"""
        if self._pool:
            await self._pool.close()
            self.logger.info("Database pool closed")

# Concrete Repository Implementation
class PostgresUserRepository(UserRepository):
    """PostgreSQL implementation of UserRepository"""
    
    def __init__(self, connection_pool: DatabaseConnectionPool):
        self.connection_pool = connection_pool
        self.logger = logging.getLogger(__name__)
    
    async def find_by_id(self, user_id: str) -> Optional[User]:
        """Find user by ID with prepared statement"""
        query = """
            SELECT id, email, name, age, created_at, updated_at
            FROM users
            WHERE id = $1
        """
        
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow(query, user_id)
                
                if row:
                    return self._row_to_user(row)
                
                return None
        
        except Exception as e:
            self.logger.error(f"Error finding user by ID {user_id}: {e}")
            raise RepositoryException(f"Failed to find user: {e}")
    
    async def save(self, user: User) -> None:
        """Save or update user with upsert"""
        query = """
            INSERT INTO users (id, email, name, age, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                age = EXCLUDED.age,
                updated_at = EXCLUDED.updated_at
        """
        
        try:
            async with self.connection_pool.acquire() as conn:
                await conn.execute(
                    query,
                    user.id,
                    user.email,
                    user.name,
                    user.age,
                    user.created_at,
                    user.updated_at
                )
            
            self.logger.info(f"User {user.id} saved successfully")
        
        except Exception as e:
            self.logger.error(f"Error saving user {user.id}: {e}")
            raise RepositoryException(f"Failed to save user: {e}")
    
    @staticmethod
    def _row_to_user(row) -> User:
        """Convert database row to User domain model"""
        return User(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            age=row["age"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

class RepositoryException(Exception):
    """Custom exception for repository errors"""
    pass

# Service Layer with Proper Error Handling
class UserService:
    """User service with clean architecture principles"""
    
    def __init__(
        self,
        user_repository: UserRepository,
        event_publisher: Optional['EventPublisher'] = None,
        cache: Optional['CacheService'] = None
    ):
        self.user_repository = user_repository
        self.event_publisher = event_publisher
        self.cache = cache
        self.logger = logging.getLogger(__name__)
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID with caching"""
        # Input validation
        if not user_id or not isinstance(user_id, str):
            raise ValueError("Invalid user ID")
        
        # Check cache first
        if self.cache:
            cached_user = await self.cache.get(f"user:{user_id}")
            if cached_user:
                self.logger.debug(f"User {user_id} found in cache")
                return cached_user
        
        # Fetch from repository
        try:
            user = await self.user_repository.find_by_id(user_id)
            
            if user and self.cache:
                # Cache for 5 minutes
                await self.cache.set(f"user:{user_id}", user, ttl=300)
            
            return user
        
        except RepositoryException as e:
            self.logger.error(f"Repository error while fetching user {user_id}: {e}")
            raise ServiceException(f"Failed to fetch user: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error while fetching user {user_id}: {e}")
            raise ServiceException("An unexpected error occurred")
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> User:
        """Update user with validation and events"""
        # Fetch existing user
        existing_user = await self.get_user(user_id)
        if not existing_user:
            raise NotFoundException(f"User {user_id} not found")
        
        # Create updated user with validation
        try:
            updated_user = User(
                id=existing_user.id,
                email=update_data.get("email", existing_user.email),
                name=update_data.get("name", existing_user.name),
                age=update_data.get("age", existing_user.age),
                created_at=existing_user.created_at,
                updated_at=datetime.utcnow()
            )
        except ValueError as e:
            raise ValidationException(f"Invalid user data: {e}")
        
        # Save to repository
        try:
            await self.user_repository.save(updated_user)
            
            # Invalidate cache
            if self.cache:
                await self.cache.delete(f"user:{user_id}")
            
            # Publish event
            if self.event_publisher:
                await self.event_publisher.publish("user.updated", {
                    "user_id": user_id,
                    "updated_fields": list(update_data.keys()),
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            self.logger.info(f"User {user_id} updated successfully")
            return updated_user
        
        except RepositoryException as e:
            self.logger.error(f"Failed to update user {user_id}: {e}")
            raise ServiceException(f"Failed to update user: {e}")

# Custom Exceptions
class ServiceException(Exception):
    """Base exception for service layer"""
    pass

class NotFoundException(ServiceException):
    """Exception raised when entity is not found"""
    pass

class ValidationException(ServiceException):
    """Exception raised for validation errors"""
    pass

# Unit Tests Example
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
class TestUserService:
    """Unit tests for UserService"""
    
    async def test_get_user_success(self):
        """Test successful user retrieval"""
        # Arrange
        mock_repo = Mock(spec=UserRepository)
        mock_repo.find_by_id = AsyncMock(return_value=User(
            id="123",
            email="test@example.com",
            name="Test User",
            age=30,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        
        service = UserService(mock_repo)
        
        # Act
        result = await service.get_user("123")
        
        # Assert
        assert result is not None
        assert result.id == "123"
        assert result.email == "test@example.com"
        mock_repo.find_by_id.assert_called_once_with("123")
    
    async def test_get_user_not_found(self):
        """Test user not found scenario"""
        # Arrange
        mock_repo = Mock(spec=UserRepository)
        mock_repo.find_by_id = AsyncMock(return_value=None)
        
        service = UserService(mock_repo)
        
        # Act
        result = await service.get_user("999")
        
        # Assert
        assert result is None
        mock_repo.find_by_id.assert_called_once_with("999")
    
    async def test_update_user_validation_error(self):
        """Test update user with invalid data"""
        # Arrange
        mock_repo = Mock(spec=UserRepository)
        mock_repo.find_by_id = AsyncMock(return_value=User(
            id="123",
            email="test@example.com",
            name="Test User",
            age=30,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        
        service = UserService(mock_repo)
        
        # Act & Assert
        with pytest.raises(ValidationException):
            await service.update_user("123", {"age": -5})
```

### Example 3: Performance Optimization

```python
"""
Performance Optimization Example

This example demonstrates various techniques for optimizing
application performance at different levels.
"""

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from functools import lru_cache, wraps
from typing import List, Dict, Any, Optional, Callable
import numpy as np
from dataclasses import dataclass
import heapq
import bisect

# 1. Algorithmic Optimization
class EfficientDataStructures:
    """Examples of using appropriate data structures for performance"""
    
    @staticmethod
    def find_top_k_elements(data: List[int], k: int) -> List[int]:
        """
        Find top K elements using a heap
        Time: O(n log k) instead of O(n log n) for sorting
        """
        if k >= len(data):
            return sorted(data, reverse=True)
        
        # Use a min heap of size k
        heap = data[:k]
        heapq.heapify(heap)
        
        for item in data[k:]:
            if item > heap[0]:
                heapq.heapreplace(heap, item)
        
        return sorted(heap, reverse=True)
    
    @staticmethod
    def range_sum_queries(data: List[int]) -> 'RangeSumQuery':
        """
        Efficient range sum queries using prefix sums
        Build: O(n), Query: O(1)
        """
        return RangeSumQuery(data)
    
    @staticmethod
    def find_intervals_containing_point(intervals: List[tuple], point: float) -> List[tuple]:
        """
        Find all intervals containing a point using interval tree concept
        """
        # Sort intervals by start point
        intervals.sort()
        
        result = []
        for start, end in intervals:
            if start > point:
                break  # No more intervals can contain the point
            if end >= point:
                result.append((start, end))
        
        return result

class RangeSumQuery:
    """Efficient range sum queries using prefix sums"""
    
    def __init__(self, data: List[int]):
        self.prefix_sums = [0]
        for num in data:
            self.prefix_sums.append(self.prefix_sums[-1] + num)
    
    def query(self, left: int, right: int) -> int:
        """Get sum of elements from index left to right (inclusive)"""
        return self.prefix_sums[right + 1] - self.prefix_sums[left]

# 2. Caching and Memoization
class CacheOptimization:
    """Various caching strategies for performance"""
    
    @staticmethod
    @lru_cache(maxsize=1024)
    def fibonacci(n: int) -> int:
        """Fibonacci with memoization"""
        if n < 2:
            return n
        return CacheOptimization.fibonacci(n - 1) + CacheOptimization.fibonacci(n - 2)
    
    @staticmethod
    def timed_lru_cache(seconds: int, maxsize: int = 128):
        """LRU cache with time-based expiration"""
        def decorator(func):
            # Store cache with timestamps
            cache = {}
            cache_order = []
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                key = str(args) + str(kwargs)
                current_time = time.time()
                
                # Check if cached and not expired
                if key in cache:
                    value, timestamp = cache[key]
                    if current_time - timestamp < seconds:
                        # Move to end (most recently used)
                        cache_order.remove(key)
                        cache_order.append(key)
                        return value
                
                # Compute result
                result = func(*args, **kwargs)
                
                # Add to cache
                cache[key] = (result, current_time)
                cache_order.append(key)
                
                # Enforce size limit
                while len(cache_order) > maxsize:
                    oldest_key = cache_order.pop(0)
                    del cache[oldest_key]
                
                return result
            
            return wrapper
        return decorator

# 3. Async and Parallel Processing
class ParallelProcessing:
    """Examples of parallel and async processing for performance"""
    
    @staticmethod
    async def fetch_multiple_urls(urls: List[str]) -> List[Dict[str, Any]]:
        """Fetch multiple URLs concurrently"""
        import aiohttp
        
        async def fetch_one(session, url):
            try:
                async with session.get(url) as response:
                    return {
                        'url': url,
                        'status': response.status,
                        'data': await response.text()
                    }
            except Exception as e:
                return {
                    'url': url,
                    'error': str(e)
                }
        
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_one(session, url) for url in urls]
            return await asyncio.gather(*tasks)
    
    @staticmethod
    def parallel_compute(data: List[int], operation: Callable) -> List[Any]:
        """
        Parallel computation using ProcessPoolExecutor
        Good for CPU-bound tasks
        """
        with ProcessPoolExecutor() as executor:
            # Chunk data for better load distribution
            chunk_size = len(data) // executor._max_workers
            chunks = [
                data[i:i + chunk_size]
                for i in range(0, len(data), chunk_size)
            ]
            
            # Process chunks in parallel
            futures = [
                executor.submit(
                    lambda chunk: [operation(x) for x in chunk],
                    chunk
                )
                for chunk in chunks
            ]
            
            # Collect results
            results = []
            for future in futures:
                results.extend(future.result())
            
            return results
    
    @staticmethod
    async def rate_limited_requests(
        urls: List[str],
        max_concurrent: int = 10,
        delay_between: float = 0.1
    ) -> List[Dict[str, Any]]:
        """Make requests with rate limiting"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def fetch_with_limit(session, url):
            async with semaphore:
                result = await ParallelProcessing._fetch_url(session, url)
                await asyncio.sleep(delay_between)
                return result
        
        import aiohttp
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_with_limit(session, url) for url in urls]
            return await asyncio.gather(*tasks)

# 4. Database Query Optimization
class DatabaseOptimization:
    """Database query optimization techniques"""
    
    @staticmethod
    def batch_insert(connection, table: str, records: List[Dict[str, Any]]):
        """
        Batch insert for better performance
        Instead of individual inserts
        """
        if not records:
            return
        
        # Build batch insert query
        columns = list(records[0].keys())
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join(columns)
        
        query = f"""
            INSERT INTO {table} ({columns_str})
            VALUES ({placeholders})
        """
        
        # Prepare data
        data = [
            tuple(record[col] for col in columns)
            for record in records
        ]
        
        # Execute batch insert
        with connection.cursor() as cursor:
            cursor.executemany(query, data)
            connection.commit()
    
    @staticmethod
    def optimize_pagination(
        connection,
        table: str,
        page_size: int,
        last_id: Optional[int] = None
    ):
        """
        Cursor-based pagination instead of OFFSET
        Much more efficient for large datasets
        """
        query = f"""
            SELECT * FROM {table}
            WHERE id > %s
            ORDER BY id
            LIMIT %s
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, (last_id or 0, page_size))
            return cursor.fetchall()

# 5. Memory Optimization
class MemoryOptimization:
    """Memory optimization techniques"""
    
    __slots__ = ['x', 'y', 'z']  # Saves memory for classes with fixed attributes
    
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z
    
    @staticmethod
    def process_large_file(filename: str, chunk_size: int = 8192):
        """Process large file in chunks to avoid loading entire file in memory"""
        with open(filename, 'r') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                
                # Process chunk
                yield chunk
    
    @staticmethod
    def memory_efficient_counter(items):
        """Count items using generator to avoid creating intermediate lists"""
        from collections import Counter
        
        # Generator expression instead of list comprehension
        return Counter(item for item in items if item is not None)

# 6. Profiling and Monitoring
class PerformanceMonitor:
    """Tools for monitoring and profiling performance"""
    
    @staticmethod
    def profile_function(func):
        """Decorator to profile function execution"""
        import cProfile
        import pstats
        from io import StringIO
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            profiler = cProfile.Profile()
            profiler.enable()
            
            result = func(*args, **kwargs)
            
            profiler.disable()
            
            # Get profile statistics
            stream = StringIO()
            stats = pstats.Stats(profiler, stream=stream)
            stats.sort_stats('cumulative')
            stats.print_stats(10)  # Top 10 functions
            
            print(f"\nProfile for {func.__name__}:")
            print(stream.getvalue())
            
            return result
        
        return wrapper
    
    @staticmethod
    def measure_time(func):
        """Decorator to measure execution time"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = await func(*args, **kwargs)
            end = time.perf_counter()
            print(f"{func.__name__} took {end - start:.4f} seconds")
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            end = time.perf_counter()
            print(f"{func.__name__} took {end - start:.4f} seconds")
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

# 7. Algorithm-specific optimizations
class AlgorithmOptimizations:
    """Specific algorithmic optimizations"""
    
    @staticmethod
    def string_matching_kmp(text: str, pattern: str) -> List[int]:
        """
        KMP algorithm for string matching
        O(n + m) instead of O(n * m) for naive approach
        """
        if not pattern:
            return []
        
        # Build failure function
        failure = [0] * len(pattern)
        j = 0
        
        for i in range(1, len(pattern)):
            while j > 0 and pattern[i] != pattern[j]:
                j = failure[j - 1]
            
            if pattern[i] == pattern[j]:
                j += 1
            
            failure[i] = j
        
        # Search for pattern
        matches = []
        j = 0
        
        for i in range(len(text)):
            while j > 0 and text[i] != pattern[j]:
                j = failure[j - 1]
            
            if text[i] == pattern[j]:
                j += 1
            
            if j == len(pattern):
                matches.append(i - len(pattern) + 1)
                j = failure[j - 1]
        
        return matches
    
    @staticmethod
    def matrix_multiplication_strassen(A: np.ndarray, B: np.ndarray) -> np.ndarray:
        """
        Strassen's algorithm for matrix multiplication
        O(n^2.807) instead of O(n^3)
        """
        n = A.shape[0]
        
        # Base case
        if n <= 64:  # Threshold for switching to standard multiplication
            return np.dot(A, B)
        
        # Ensure matrices are square and size is power of 2
        if n & (n - 1) != 0:
            # Pad to next power of 2
            next_power = 1 << (n - 1).bit_length()
            A = np.pad(A, ((0, next_power - n), (0, next_power - n)))
            B = np.pad(B, ((0, next_power - n), (0, next_power - n)))
            n = next_power
        
        # Divide matrices
        mid = n // 2
        A11, A12 = A[:mid, :mid], A[:mid, mid:]
        A21, A22 = A[mid:, :mid], A[mid:, mid:]
        B11, B12 = B[:mid, :mid], B[:mid, mid:]
        B21, B22 = B[mid:, :mid], B[mid:, mid:]
        
        # Strassen's formulas
        M1 = AlgorithmOptimizations.matrix_multiplication_strassen(A11 + A22, B11 + B22)
        M2 = AlgorithmOptimizations.matrix_multiplication_strassen(A21 + A22, B11)
        M3 = AlgorithmOptimizations.matrix_multiplication_strassen(A11, B12 - B22)
        M4 = AlgorithmOptimizations.matrix_multiplication_strassen(A22, B21 - B11)
        M5 = AlgorithmOptimizations.matrix_multiplication_strassen(A11 + A12, B22)
        M6 = AlgorithmOptimizations.matrix_multiplication_strassen(A21 - A11, B11 + B12)
        M7 = AlgorithmOptimizations.matrix_multiplication_strassen(A12 - A22, B21 + B22)
        
        # Combine results
        C11 = M1 + M4 - M5 + M7
        C12 = M3 + M5
        C21 = M2 + M4
        C22 = M1 - M2 + M3 + M6
        
        # Construct result
        C = np.vstack([
            np.hstack([C11, C12]),
            np.hstack([C21, C22])
        ])
        
        # Remove padding if necessary
        return C[:A.shape[0], :B.shape[1]]

# Usage Examples
if __name__ == "__main__":
    # Example 1: Efficient data structure usage
    data = list(range(1000000))
    top_10 = EfficientDataStructures.find_top_k_elements(data, 10)
    print(f"Top 10 elements: {top_10}")
    
    # Example 2: Range sum queries
    rsq = EfficientDataStructures.range_sum_queries([1, 2, 3, 4, 5])
    print(f"Sum of elements 1-3: {rsq.query(1, 3)}")  # 9 (2+3+4)
    
    # Example 3: Cached computation
    @CacheOptimization.timed_lru_cache(seconds=60)
    def expensive_computation(n):
        time.sleep(1)  # Simulate expensive operation
        return n * n
    
    # First call takes 1 second
    result1 = expensive_computation(5)
    # Second call returns immediately from cache
    result2 = expensive_computation(5)
    
    # Example 4: Parallel processing
    data = list(range(100))
    results = ParallelProcessing.parallel_compute(
        data,
        lambda x: x * x
    )
    
    # Example 5: Memory-efficient file processing
    for chunk in MemoryOptimization.process_large_file('large_file.txt'):
        # Process chunk without loading entire file
        processed = chunk.upper()
```

## Best Practices

1. **Code Quality**: Write clean, readable, and maintainable code
2. **Testing**: Implement comprehensive test coverage
3. **Documentation**: Document code, APIs, and architectural decisions
4. **Performance**: Profile and optimize critical paths
5. **Security**: Follow security best practices and conduct reviews

## Software Engineering Principles

- SOLID principles for object-oriented design
- DRY (Don't Repeat Yourself) for code reusability
- YAGNI (You Aren't Gonna Need It) for simplicity
- Separation of concerns for modularity
- Dependency injection for testability

## Related Agents

- **system-architect**: For large-scale system design
- **code-reviewer**: For specialized code review
- **performance-engineer**: For performance optimization
- **security-specialist**: For security assessments