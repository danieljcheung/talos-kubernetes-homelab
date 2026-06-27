# Agent Event Ledger Deployment

Date: 2026-06-27

## Decision

Deploy the Agent Event Ledger as a lightweight, secure service within the homelab cluster. The ledger runs as a stateless API server backed by a CloudNativePG (CNPG) database cluster, and is monitored via Prometheus ServiceMonitor.

```text
Orchestrator / CLI
  -> internal Kubernetes service (agent-event-ledger:8080)
  -> Agent Event Ledger API Server
  -> CloudNativePG Postgres (agent-event-ledger-db-rw:5432)
  -> Longhorn PVC (5Gi)
```

## Architecture & Layout

The GitOps manifests are organized in `manifests/agent-event-ledger/` and include:

1. **Namespace (`namespace.yaml`)**:
   - Name: `agent-event-ledger`
   - Security: Configured with Pod Security Standards (PSS) `restricted` labels:
     - `pod-security.kubernetes.io/enforce: restricted`
     - `pod-security.kubernetes.io/enforce-version: latest`
     - `pod-security.kubernetes.io/warn: restricted`
     - `pod-security.kubernetes.io/warn-version: latest`
     - `pod-security.kubernetes.io/audit: restricted`
     - `pod-security.kubernetes.io/audit-version: latest`

2. **Database (`db.yaml`)**:
   - Type: CloudNativePG `Cluster` named `agent-event-ledger-db`
   - Scale: `1` instance (non-production homelab slice)
   - Database Name: `agent_event_ledger`
   - Database Owner: `agent_event_ledger`
   - Storage: `longhorn` storage class, size `5Gi`
   - Credentials: Relying on CNPG-generated secrets (`agent-event-ledger-db-app`) rather than committing plaintext credentials to Git.

3. **Deployment (`deployment.yaml`)**:
   - Image: `ghcr.io/danieljcheung/agent-event-ledger:latest`
   - Port: `8080`
   - Probes:
     - Liveness: `/healthz/liveness` on port `http` (8080)
     - Readiness: `/healthz/readiness` on port `http` (8080)
   - Pod Security Context: Run as non-root, user `10001`, group `10001`, fsGroup `10001`, seccomp profile `RuntimeDefault`.
   - Container Security Context: Drop `ALL` capabilities, prevent privilege escalation, read-only root filesystem.
   - Resource Constraints:
     - Requests: `50m` CPU, `128Mi` Memory
     - Limits: `500m` CPU, `256Mi` Memory
   - Environment: Dynamic interpolation of `DATABASE_URL` using container env variables referencing keys `username` and `password` from the CNPG-generated secret.

4. **Service (`service.yaml`)**:
   - Exposes port `8080` internally for API traffic.

5. **Telemetry (`servicemonitor.yaml`)**:
   - ServiceMonitor selector targeting the application pods with label `release: monitoring` to integrate with the cluster's Prometheus/Grafana stack.
   - Path: `/metrics` on port `8080`.

6. **Network Policy (`networkpolicy.yaml`)**:
   - Default deny on ingress, selectively allowing:
     - All intra-namespace traffic (allowing communication between the API server and the database).
     - Ingress on port `8080` from the `monitoring` namespace (for metric collection by Alloy/Prometheus).

## Argo CD Application

The application is registered in `manifests/argocd/apps/agent-event-ledger.yaml`:
- Repository: `https://github.com/danieljcheung/talos-kubernetes-homelab.git`
- Path: `manifests/agent-event-ledger`
- Destination Namespace: `agent-event-ledger`
- Sync Policy: `CreateNamespace=false` (managed by the namespace resource in the repository Kustomization bundle).
