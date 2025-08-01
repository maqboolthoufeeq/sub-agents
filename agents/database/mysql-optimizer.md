---
name: mysql-optimizer
category: database
description: MySQL performance optimization expert for query tuning, indexing, and database design
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
  - mysql
  - database
  - optimization
  - performance
  - sql
  - indexing
keywords:
  - mysql
  - mariadb
  - query-optimization
  - indexing
  - performance-tuning
  - replication
dependencies:
  - mysql
---

# MySQL Optimizer Agent

Expert in MySQL performance optimization, specializing in query tuning, indexing strategies, and database design for high-performance applications.

## Overview

This agent specializes in:
- Query optimization and execution plan analysis
- Index design and optimization
- Database schema optimization
- Partitioning strategies
- Replication and high availability
- Performance monitoring and tuning
- Storage engine selection and configuration

## Capabilities

- **Query Optimization**: Analyze and optimize slow queries
- **Index Design**: Create optimal indexes for query patterns
- **Schema Design**: Design efficient database schemas
- **Partitioning**: Implement table partitioning strategies
- **Replication**: Configure master-slave and master-master replication
- **Performance Tuning**: Optimize MySQL configuration parameters
- **Monitoring**: Set up performance monitoring and alerting
- **Storage Engines**: Choose and configure appropriate storage engines
- **Backup Strategies**: Implement efficient backup and recovery
- **Migration**: Optimize database migrations and upgrades

## Usage

Best suited for:
- High-traffic web applications
- Data warehousing solutions
- E-commerce platforms
- Analytics databases
- Financial systems
- Content management systems

## Examples

### Example 1: Advanced Query Optimization

```sql
-- Original slow query
SELECT 
    o.order_id,
    o.order_date,
    c.customer_name,
    c.email,
    SUM(oi.quantity * oi.unit_price) as total_amount,
    COUNT(DISTINCT oi.product_id) as unique_products
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND c.country = 'USA'
    AND o.status = 'completed'
GROUP BY o.order_id
HAVING total_amount > 1000
ORDER BY total_amount DESC
LIMIT 100;

-- Analyze execution plan
EXPLAIN SELECT ... \G

-- Create covering indexes for optimization
CREATE INDEX idx_orders_date_status_customer 
ON orders(order_date, status, customer_id, order_id);

CREATE INDEX idx_customers_country_id 
ON customers(country, customer_id, customer_name, email);

CREATE INDEX idx_order_items_order_product 
ON order_items(order_id, product_id, quantity, unit_price);

-- Optimized query with subquery for better performance
WITH order_totals AS (
    SELECT 
        oi.order_id,
        SUM(oi.quantity * oi.unit_price) as total_amount,
        COUNT(DISTINCT oi.product_id) as unique_products
    FROM order_items oi
    GROUP BY oi.order_id
    HAVING total_amount > 1000
)
SELECT 
    o.order_id,
    o.order_date,
    c.customer_name,
    c.email,
    ot.total_amount,
    ot.unique_products
FROM orders o
STRAIGHT_JOIN order_totals ot ON o.order_id = ot.order_id
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND o.status = 'completed'
    AND c.country = 'USA'
ORDER BY ot.total_amount DESC
LIMIT 100;

-- Further optimization with summary table
CREATE TABLE order_summary (
    order_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    unique_products INT NOT NULL,
    INDEX idx_date_status (order_date, status),
    INDEX idx_customer (customer_id),
    INDEX idx_amount (total_amount)
) ENGINE=InnoDB;

-- Populate summary table with trigger
DELIMITER $$

CREATE TRIGGER update_order_summary
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    INSERT INTO order_summary (
        order_id, 
        customer_id, 
        order_date, 
        status, 
        total_amount, 
        unique_products
    )
    SELECT 
        o.order_id,
        o.customer_id,
        o.order_date,
        o.status,
        SUM(oi.quantity * oi.unit_price),
        COUNT(DISTINCT oi.product_id)
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_id = NEW.order_id
    GROUP BY o.order_id
    ON DUPLICATE KEY UPDATE
        total_amount = VALUES(total_amount),
        unique_products = VALUES(unique_products);
END$$

DELIMITER ;
```

### Example 2: Partitioning Strategy for Large Tables

```sql
-- Range partitioning for time-series data
ALTER TABLE orders
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2020 VALUES LESS THAN (2021),
    PARTITION p2021 VALUES LESS THAN (2022),
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Sub-partitioning by hash for better distribution
ALTER TABLE order_items
PARTITION BY RANGE (YEAR(created_date))
SUBPARTITION BY HASH(order_id)
SUBPARTITIONS 4 (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- List partitioning for categorical data
ALTER TABLE customers
PARTITION BY LIST COLUMNS(country) (
    PARTITION p_north_america VALUES IN ('USA', 'Canada', 'Mexico'),
    PARTITION p_europe VALUES IN ('UK', 'Germany', 'France', 'Italy', 'Spain'),
    PARTITION p_asia VALUES IN ('China', 'Japan', 'India', 'Singapore'),
    PARTITION p_other VALUES IN (DEFAULT)
);

-- Partition maintenance procedures
DELIMITER $$

CREATE PROCEDURE maintain_partitions()
BEGIN
    DECLARE next_year INT DEFAULT YEAR(CURDATE()) + 1;
    DECLARE partition_name VARCHAR(64);
    
    -- Add new partition for next year
    SET partition_name = CONCAT('p', next_year);
    
    SET @sql = CONCAT('ALTER TABLE orders ',
        'REORGANIZE PARTITION p_future INTO (',
        'PARTITION ', partition_name, ' VALUES LESS THAN (', next_year + 1, '),',
        'PARTITION p_future VALUES LESS THAN MAXVALUE)');
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    -- Drop old partitions (keep 3 years)
    SET @drop_year = next_year - 4;
    SET @sql = CONCAT('ALTER TABLE orders DROP PARTITION p', @drop_year);
    
    -- Check if partition exists before dropping
    IF EXISTS (
        SELECT 1 FROM information_schema.partitions 
        WHERE table_schema = DATABASE() 
        AND table_name = 'orders' 
        AND partition_name = CONCAT('p', @drop_year)
    ) THEN
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Schedule partition maintenance
CREATE EVENT partition_maintenance_event
ON SCHEDULE EVERY 1 MONTH
DO CALL maintain_partitions();
```

### Example 3: Performance Monitoring and Tuning

```sql
-- Create performance monitoring schema
CREATE DATABASE IF NOT EXISTS performance_monitor;
USE performance_monitor;

-- Slow query log analysis table
CREATE TABLE slow_query_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_fingerprint VARCHAR(32) NOT NULL,
    sample_query TEXT,
    total_executions INT DEFAULT 0,
    total_time DECIMAL(10,2) DEFAULT 0,
    avg_time DECIMAL(10,2) DEFAULT 0,
    max_time DECIMAL(10,2) DEFAULT 0,
    rows_examined_avg INT DEFAULT 0,
    rows_sent_avg INT DEFAULT 0,
    first_seen DATETIME,
    last_seen DATETIME,
    INDEX idx_fingerprint (query_fingerprint),
    INDEX idx_total_time (total_time DESC),
    INDEX idx_avg_time (avg_time DESC)
) ENGINE=InnoDB;

-- Procedure to analyze slow query log
DELIMITER $$

CREATE PROCEDURE analyze_slow_queries()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_query TEXT;
    DECLARE v_query_time DECIMAL(10,2);
    DECLARE v_rows_examined INT;
    DECLARE v_rows_sent INT;
    DECLARE v_fingerprint VARCHAR(32);
    
    DECLARE cur CURSOR FOR 
        SELECT sql_text, query_time, rows_examined, rows_sent
        FROM mysql.slow_log
        WHERE start_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_query, v_query_time, v_rows_examined, v_rows_sent;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Generate query fingerprint (simplified)
        SET v_fingerprint = MD5(REGEXP_REPLACE(v_query, '[0-9]+', '?'));
        
        -- Update or insert analysis
        INSERT INTO slow_query_analysis (
            query_fingerprint,
            sample_query,
            total_executions,
            total_time,
            avg_time,
            max_time,
            rows_examined_avg,
            rows_sent_avg,
            first_seen,
            last_seen
        ) VALUES (
            v_fingerprint,
            v_query,
            1,
            v_query_time,
            v_query_time,
            v_query_time,
            v_rows_examined,
            v_rows_sent,
            NOW(),
            NOW()
        ) ON DUPLICATE KEY UPDATE
            total_executions = total_executions + 1,
            total_time = total_time + v_query_time,
            avg_time = (total_time + v_query_time) / (total_executions + 1),
            max_time = GREATEST(max_time, v_query_time),
            rows_examined_avg = (rows_examined_avg * total_executions + v_rows_examined) / (total_executions + 1),
            rows_sent_avg = (rows_sent_avg * total_executions + v_rows_sent) / (total_executions + 1),
            last_seen = NOW(),
            sample_query = IF(v_query_time > max_time, v_query, sample_query);
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

-- Index usage statistics
CREATE TABLE index_usage_stats (
    table_schema VARCHAR(64),
    table_name VARCHAR(64),
    index_name VARCHAR(64),
    columns_in_index TEXT,
    cardinality BIGINT,
    pages INT,
    size_mb DECIMAL(10,2),
    PRIMARY KEY (table_schema, table_name, index_name)
) ENGINE=InnoDB;

-- Procedure to collect index statistics
DELIMITER $$

CREATE PROCEDURE collect_index_stats()
BEGIN
    TRUNCATE TABLE index_usage_stats;
    
    INSERT INTO index_usage_stats
    SELECT 
        s.table_schema,
        s.table_name,
        s.index_name,
        GROUP_CONCAT(s.column_name ORDER BY s.seq_in_index) as columns_in_index,
        s.cardinality,
        CEIL(s.cardinality * t.avg_row_length / t.data_length * t.data_length / 16384) as pages,
        ROUND(s.cardinality * t.avg_row_length / 1048576, 2) as size_mb
    FROM information_schema.statistics s
    JOIN information_schema.tables t 
        ON s.table_schema = t.table_schema 
        AND s.table_name = t.table_name
    WHERE s.table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
    GROUP BY s.table_schema, s.table_name, s.index_name, s.cardinality, t.avg_row_length, t.data_length;
    
    -- Identify unused indexes
    SELECT 
        CONCAT('ALTER TABLE `', table_schema, '`.`', table_name, '` DROP INDEX `', index_name, '`;') as drop_statement
    FROM index_usage_stats i
    WHERE NOT EXISTS (
        SELECT 1 
        FROM performance_schema.table_io_waits_summary_by_index_usage u
        WHERE u.object_schema = i.table_schema 
        AND u.object_name = i.table_name 
        AND u.index_name = i.index_name
        AND u.count_star > 0
    )
    AND index_name != 'PRIMARY';
END$$

DELIMITER ;

-- MySQL configuration recommendations
CREATE TABLE config_recommendations (
    parameter VARCHAR(64) PRIMARY KEY,
    current_value VARCHAR(255),
    recommended_value VARCHAR(255),
    reason TEXT
) ENGINE=InnoDB;

-- Procedure to generate configuration recommendations
DELIMITER $$

CREATE PROCEDURE generate_config_recommendations()
BEGIN
    DECLARE total_ram BIGINT;
    DECLARE innodb_pool_size BIGINT;
    
    -- Get system information
    SELECT VARIABLE_VALUE INTO total_ram 
    FROM performance_schema.global_variables 
    WHERE VARIABLE_NAME = 'innodb_buffer_pool_size';
    
    -- Clear previous recommendations
    TRUNCATE TABLE config_recommendations;
    
    -- InnoDB Buffer Pool Size
    SET innodb_pool_size = ROUND(total_ram * 0.7);
    INSERT INTO config_recommendations VALUES (
        'innodb_buffer_pool_size',
        (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'innodb_buffer_pool_size'),
        CONCAT(ROUND(innodb_pool_size / 1073741824, 1), 'G'),
        'Should be 70-80% of total RAM for dedicated MySQL servers'
    );
    
    -- Query Cache (deprecated in MySQL 8.0)
    IF (SELECT VERSION() < '8.0') THEN
        INSERT INTO config_recommendations VALUES (
            'query_cache_type',
            (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'query_cache_type'),
            '0',
            'Query cache is deprecated and often causes contention'
        );
    END IF;
    
    -- Additional recommendations based on workload
    -- ... (more configuration recommendations)
END$$

DELIMITER ;
```

## Best Practices

1. **Index Strategy**: Create indexes for WHERE, JOIN, ORDER BY, and GROUP BY columns
2. **Query Design**: Avoid SELECT *, use LIMIT, optimize JOIN order
3. **Schema Design**: Normalize appropriately, use proper data types
4. **Monitoring**: Enable slow query log, use performance schema
5. **Maintenance**: Regular ANALYZE TABLE, optimize table fragmentation

## Performance Tips

- Use covering indexes to avoid table lookups
- Partition large tables by date or category
- Implement read replicas for read-heavy workloads
- Use connection pooling to reduce overhead
- Monitor and optimize buffer pool hit ratio

## Related Agents

- **database-architect**: For overall database design
- **sql-expert**: For complex SQL query writing
- **devops-engineer**: For MySQL deployment and scaling
- **monitoring-specialist**: For comprehensive monitoring setup