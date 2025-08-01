---
name: mongodb-specialist
category: database
description: MongoDB expert for NoSQL database design, performance tuning, and distributed systems
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
  - mongodb
  - nosql
  - database
  - distributed
  - performance
  - aggregation
keywords:
  - mongodb
  - mongoose
  - aggregation-framework
  - sharding
  - replication
  - atlas
dependencies:
  - mongodb
---

# MongoDB Specialist Agent

Expert in MongoDB database design, implementation, and optimization, specializing in distributed systems, aggregation pipelines, and performance tuning.

## Overview

This agent specializes in:
- MongoDB schema design and data modeling
- Aggregation framework and complex queries
- Performance optimization and indexing strategies
- Replication and sharding configuration
- MongoDB Atlas cloud deployment
- Change streams and real-time applications
- Security and access control

## Capabilities

- **Schema Design**: Design flexible document schemas for various use cases
- **Aggregation Pipelines**: Build complex data processing pipelines
- **Performance Tuning**: Optimize queries, indexes, and shard keys
- **Replication**: Configure replica sets for high availability
- **Sharding**: Design and implement horizontal scaling strategies
- **Atlas Management**: Deploy and manage MongoDB Atlas clusters
- **Security**: Implement authentication, authorization, and encryption
- **Monitoring**: Set up monitoring and alerting
- **Migration**: Migrate from relational databases to MongoDB
- **Backup/Recovery**: Implement backup and disaster recovery strategies

## Usage

Best suited for:
- Real-time analytics applications
- Content management systems
- IoT data storage and processing
- Social media platforms
- E-commerce product catalogs
- Gaming leaderboards and player data

## Examples

### Example 1: Advanced Schema Design with Validation

```javascript
// Product catalog with embedded and referenced patterns
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "sku", "price", "category", "status"],
      properties: {
        name: {
          bsonType: "string",
          description: "Product name - required"
        },
        sku: {
          bsonType: "string",
          pattern: "^[A-Z]{3}-[0-9]{6}$",
          description: "SKU must match pattern XXX-000000"
        },
        price: {
          bsonType: "object",
          required: ["amount", "currency"],
          properties: {
            amount: {
              bsonType: "decimal",
              minimum: 0,
              description: "Price amount must be positive"
            },
            currency: {
              enum: ["USD", "EUR", "GBP"],
              description: "Currency code"
            }
          }
        },
        category: {
          bsonType: "objectId",
          description: "Reference to categories collection"
        },
        attributes: {
          bsonType: "object",
          description: "Dynamic attributes based on category"
        },
        variants: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["sku", "attributes", "stock"],
            properties: {
              sku: { bsonType: "string" },
              attributes: { bsonType: "object" },
              stock: {
                bsonType: "object",
                required: ["available", "reserved"],
                properties: {
                  available: { bsonType: "int", minimum: 0 },
                  reserved: { bsonType: "int", minimum: 0 }
                }
              }
            }
          }
        },
        reviews: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["rating", "userId", "createdAt"],
            properties: {
              rating: {
                bsonType: "int",
                minimum: 1,
                maximum: 5
              },
              comment: { bsonType: "string" },
              userId: { bsonType: "objectId" },
              helpful: {
                bsonType: "object",
                properties: {
                  yes: { bsonType: "int", minimum: 0 },
                  no: { bsonType: "int", minimum: 0 }
                }
              }
            }
          }
        },
        status: {
          enum: ["active", "inactive", "discontinued"],
          description: "Product status"
        },
        tags: {
          bsonType: "array",
          uniqueItems: true,
          items: { bsonType: "string" }
        },
        metadata: {
          bsonType: "object",
          properties: {
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
            version: { bsonType: "int" }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// Indexes for optimal performance
db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "name": "text", "tags": "text" });
db.products.createIndex({ "category": 1, "status": 1 });
db.products.createIndex({ "price.amount": 1 });
db.products.createIndex({ "variants.sku": 1 });
db.products.createIndex({ "metadata.createdAt": -1 });

// Compound index for common query pattern
db.products.createIndex({ 
  "category": 1, 
  "status": 1, 
  "price.amount": 1 
}, { 
  name: "category_status_price" 
});

// Partial index for active products only
db.products.createIndex(
  { "reviews.rating": -1 },
  { 
    partialFilterExpression: { status: "active" },
    name: "active_products_rating"
  }
);
```

### Example 2: Complex Aggregation Pipeline

```javascript
// E-commerce analytics aggregation
db.orders.aggregate([
  // Stage 1: Match orders from last 30 days
  {
    $match: {
      createdAt: {
        $gte: new Date(new Date().setDate(new Date().getDate() - 30))
      },
      status: { $in: ["completed", "shipped", "delivered"] }
    }
  },
  
  // Stage 2: Lookup customer information
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  
  // Stage 3: Unwind order items for detailed analysis
  { $unwind: "$items" },
  
  // Stage 4: Lookup product information
  {
    $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            name: 1,
            category: 1,
            brand: 1
          }
        }
      ],
      as: "items.product"
    }
  },
  {
    $set: {
      "items.product": { $arrayElemAt: ["$items.product", 0] }
    }
  },
  
  // Stage 5: Calculate item revenue
  {
    $addFields: {
      "items.revenue": {
        $multiply: ["$items.quantity", "$items.price"]
      },
      "items.profit": {
        $multiply: [
          "$items.quantity",
          { $subtract: ["$items.price", "$items.cost"] }
        ]
      }
    }
  },
  
  // Stage 6: Group by multiple dimensions
  {
    $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        category: "$items.product.category",
        customerSegment: "$customer.segment",
        region: "$shippingAddress.region"
      },
      orders: { $addToSet: "$orderId" },
      revenue: { $sum: "$items.revenue" },
      profit: { $sum: "$items.profit" },
      quantity: { $sum: "$items.quantity" },
      avgOrderValue: { $avg: "$items.revenue" }
    }
  },
  
  // Stage 7: Calculate additional metrics
  {
    $addFields: {
      orderCount: { $size: "$orders" },
      profitMargin: {
        $multiply: [
          100,
          { $divide: ["$profit", "$revenue"] }
        ]
      }
    }
  },
  
  // Stage 8: Sort by revenue descending
  { $sort: { revenue: -1 } },
  
  // Stage 9: Faceted aggregation for summary stats
  {
    $facet: {
      // Top performing categories
      topCategories: [
        {
          $group: {
            _id: "$_id.category",
            totalRevenue: { $sum: "$revenue" },
            totalOrders: { $sum: "$orderCount" }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ],
      
      // Revenue by date
      revenueTimeline: [
        {
          $group: {
            _id: "$_id.date",
            dailyRevenue: { $sum: "$revenue" },
            dailyOrders: { $sum: "$orderCount" }
          }
        },
        { $sort: { _id: 1 } }
      ],
      
      // Customer segment analysis
      segmentAnalysis: [
        {
          $group: {
            _id: "$_id.customerSegment",
            avgOrderValue: { $avg: "$avgOrderValue" },
            totalRevenue: { $sum: "$revenue" },
            orderCount: { $sum: "$orderCount" }
          }
        },
        {
          $project: {
            segment: "$_id",
            avgOrderValue: { $round: ["$avgOrderValue", 2] },
            totalRevenue: { $round: ["$totalRevenue", 2] },
            orderCount: 1,
            revenuePerOrder: {
              $round: [
                { $divide: ["$totalRevenue", "$orderCount"] },
                2
              ]
            }
          }
        }
      ],
      
      // Overall summary
      summary: [
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$revenue" },
            totalProfit: { $sum: "$profit" },
            totalOrders: { $sum: "$orderCount" },
            avgProfitMargin: { $avg: "$profitMargin" }
          }
        }
      ]
    }
  },
  
  // Stage 10: Merge results
  {
    $project: {
      summary: { $arrayElemAt: ["$summary", 0] },
      topCategories: 1,
      revenueTimeline: 1,
      segmentAnalysis: 1
    }
  }
], {
  allowDiskUse: true,
  hint: { createdAt: -1 }
});

// Real-time metrics with change streams
const pipeline = [
  {
    $match: {
      "fullDocument.status": { $in: ["completed", "shipped"] },
      operationType: { $in: ["insert", "update"] }
    }
  },
  {
    $project: {
      orderId: "$fullDocument._id",
      total: "$fullDocument.total",
      customerId: "$fullDocument.customerId",
      timestamp: "$clusterTime"
    }
  }
];

const changeStream = db.orders.watch(pipeline, {
  fullDocument: "updateLookup"
});

changeStream.on("change", (change) => {
  // Process real-time order updates
  updateDashboard(change);
});
```

### Example 3: Sharding Configuration

```javascript
// Enable sharding on database
sh.enableSharding("ecommerce");

// Shard collection with compound shard key
sh.shardCollection(
  "ecommerce.orders",
  { customerId: 1, createdAt: 1 }
);

// Add shard tags for zone sharding
sh.addShardTag("shard0001", "US-EAST");
sh.addShardTag("shard0002", "US-WEST");
sh.addShardTag("shard0003", "EU");
sh.addShardTag("shard0004", "ASIA");

// Define tag ranges based on customer region
sh.addTagRange(
  "ecommerce.customers",
  { region: "us-east-1" },
  { region: "us-east-9" },
  "US-EAST"
);

sh.addTagRange(
  "ecommerce.customers",
  { region: "eu-west-1" },
  { region: "eu-west-9" },
  "EU"
);

// Monitoring sharding distribution
db.orders.getShardDistribution();

// Balancer configuration
sh.setBalancerState(true);
sh.configureCollectionBalancing("ecommerce.orders", {
  chunkSize: 128,
  _secondaryThrottle: true,
  _waitForDelete: true
});

// Custom migration script with error handling
function migrateChunks(namespace, fromShard, toShard, limit = 10) {
  const chunks = db.getSiblingDB("config").chunks.find({
    ns: namespace,
    shard: fromShard
  }).limit(limit);
  
  const results = [];
  chunks.forEach(chunk => {
    try {
      const result = sh.moveChunk(
        namespace,
        { _id: chunk.min._id },
        toShard
      );
      results.push({
        chunk: chunk._id,
        success: true,
        result: result
      });
    } catch (e) {
      results.push({
        chunk: chunk._id,
        success: false,
        error: e.message
      });
    }
  });
  
  return results;
}
```

## Best Practices

1. **Schema Design**: Design for your queries, not for normalization
2. **Indexing**: Create indexes for all query patterns
3. **Aggregation**: Use $match early in pipelines to reduce data
4. **Sharding**: Choose shard keys that provide good distribution
5. **Monitoring**: Set up monitoring for slow queries and replication lag

## Performance Optimization

- Use covered queries when possible
- Implement proper connection pooling
- Enable compression for network traffic
- Use read preferences for read scaling
- Implement caching strategies

## Related Agents

- **database-architect**: For overall database design
- **nodejs-expert**: For MongoDB driver usage
- **performance-optimizer**: For application-level optimization
- **devops-engineer**: For deployment and monitoring