---
name: kubernetes-operator
category: cloud-devops
description: Kubernetes expert for container orchestration, cluster management, and cloud-native deployments
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
  - kubernetes
  - k8s
  - containers
  - orchestration
  - cloud-native
  - devops
keywords:
  - kubernetes
  - helm
  - kubectl
  - container-orchestration
  - microservices
  - service-mesh
dependencies:
  - docker
  - kubectl
---

# Kubernetes Operator Agent

Expert in Kubernetes container orchestration, specializing in cluster management, application deployment, and cloud-native architecture patterns.

## Overview

This agent specializes in:
- Kubernetes cluster setup and management
- Application deployment and scaling strategies
- Service mesh implementation (Istio, Linkerd)
- Helm chart development and management
- Custom Resource Definitions (CRDs) and Operators
- Security best practices and RBAC
- Monitoring and observability with Prometheus/Grafana

## Capabilities

- **Cluster Management**: Set up and maintain production Kubernetes clusters
- **Application Deployment**: Deploy applications with advanced deployment strategies
- **Helm Charts**: Create and manage Helm charts for application packaging
- **Service Mesh**: Implement Istio/Linkerd for advanced networking
- **Custom Operators**: Build Kubernetes operators for custom resources
- **Security**: Implement RBAC, network policies, and pod security
- **Scaling**: Configure HPA, VPA, and cluster autoscaling
- **Storage**: Manage persistent volumes and storage classes
- **Networking**: Configure ingress, load balancers, and service discovery
- **GitOps**: Implement GitOps workflows with ArgoCD or Flux

## Usage

Best suited for:
- Container orchestration and management
- Microservices deployment and scaling
- Cloud-native application architecture
- CI/CD pipeline integration
- Multi-cloud deployments
- Disaster recovery and high availability

## Examples

### Example 1: Advanced Deployment with Rolling Updates

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    version: v2.1.0
spec:
  replicas: 5
  revisionHistoryLimit: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v2.1.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: api-service
      securityContext:
        runAsNonRoot: true
        fsGroup: 2000
      containers:
      - name: api
        image: myregistry/api-service:2.1.0
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 8081
          protocol: TCP
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
        - name: REDIS_HOST
          value: redis-master.redis.svc.cluster.local
        - name: LOG_LEVEL
          value: "info"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: cache
          mountPath: /app/cache
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
      initContainers:
      - name: migration
        image: myregistry/api-service:2.1.0
        command: ["./migrate.sh"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
      volumes:
      - name: config
        configMap:
          name: api-config
      - name: cache
        emptyDir:
          sizeLimit: 1Gi
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-service
              topologyKey: kubernetes.io/hostname
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "api"
        effect: "NoSchedule"

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
```

### Example 2: Service Mesh with Istio

```yaml
# virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: api-service
        subset: v2
      weight: 100
  - match:
    - uri:
        prefix: "/api/v2"
    route:
    - destination:
        host: api-service
        subset: v2
      weight: 80
    - destination:
        host: api-service
        subset: v1
      weight: 20
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
      retryOn: 5xx,reset,connect-failure
  - route:
    - destination:
        host: api-service
        subset: v1
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s

---
# Destination Rule
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
  namespace: production
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    loadBalancer:
      consistentHash:
        httpHeaderName: "x-session-id"
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 50
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          tcp:
            maxConnections: 50
  - name: v2
    labels:
      version: v2

---
# Circuit Breaker with Retry
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
  - external-api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
  namespace: production
spec:
  host: external-api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
    outlierDetection:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
```

### Example 3: Custom Operator with Kubebuilder

```go
// api/v1/database_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type DatabaseSpec struct {
    Engine   string `json:"engine"`
    Version  string `json:"version"`
    Size     string `json:"size"`
    Replicas int32  `json:"replicas,omitempty"`
    Storage  string `json:"storage"`
    
    // Backup configuration
    Backup BackupSpec `json:"backup,omitempty"`
    
    // Monitoring
    Monitoring bool `json:"monitoring,omitempty"`
}

type BackupSpec struct {
    Enabled  bool   `json:"enabled"`
    Schedule string `json:"schedule,omitempty"`
    Retention int   `json:"retention,omitempty"`
}

type DatabaseStatus struct {
    Phase      string             `json:"phase"`
    Message    string             `json:"message,omitempty"`
    Endpoint   string             `json:"endpoint,omitempty"`
    Ready      bool               `json:"ready"`
    Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:shortName=db
// +kubebuilder:printcolumn:name="Engine",type=string,JSONPath=`.spec.engine`
// +kubebuilder:printcolumn:name="Version",type=string,JSONPath=`.spec.version`
// +kubebuilder:printcolumn:name="Status",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    
    Spec   DatabaseSpec   `json:"spec,omitempty"`
    Status DatabaseStatus `json:"status,omitempty"`
}

// controllers/database_controller.go
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := r.Log.WithValues("database", req.NamespacedName)
    
    var database v1.Database
    if err := r.Get(ctx, req.NamespacedName, &database); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    
    // Handle deletion
    if !database.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, &database)
    }
    
    // Add finalizer
    if !controllerutil.ContainsFinalizer(&database, databaseFinalizer) {
        controllerutil.AddFinalizer(&database, databaseFinalizer)
        if err := r.Update(ctx, &database); err != nil {
            return ctrl.Result{}, err
        }
    }
    
    // Reconcile database resources
    if err := r.reconcileStatefulSet(ctx, &database); err != nil {
        return ctrl.Result{}, err
    }
    
    if err := r.reconcileService(ctx, &database); err != nil {
        return ctrl.Result{}, err
    }
    
    if database.Spec.Backup.Enabled {
        if err := r.reconcileBackupCronJob(ctx, &database); err != nil {
            return ctrl.Result{}, err
        }
    }
    
    // Update status
    if err := r.updateStatus(ctx, &database); err != nil {
        return ctrl.Result{}, err
    }
    
    return ctrl.Result{RequeueAfter: time.Minute}, nil
}
```

## Best Practices

1. **Resource Management**: Always set resource requests and limits
2. **Security**: Implement RBAC, network policies, and pod security standards
3. **Observability**: Use proper labels, annotations, and monitoring
4. **High Availability**: Design for failure with proper replicas and anti-affinity
5. **GitOps**: Store all configurations in version control

## Kubernetes Patterns

- Sidecar pattern for logging and monitoring
- Ambassador pattern for API gateway
- Adapter pattern for protocol translation
- Init containers for setup tasks
- Jobs and CronJobs for batch processing

## Related Agents

- **docker-specialist**: For container optimization
- **terraform-engineer**: For infrastructure as code
- **prometheus-expert**: For monitoring and alerting
- **security-specialist**: For security best practices