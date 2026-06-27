# Agent Event Ledger Manifests

This directory contains the Kubernetes GitOps manifests for deploying the Agent Event Ledger to the homelab.

## Layout

- `namespace.yaml`: Namespace configuration with strict Pod Security Standards (`restricted` profile labels).
- `db.yaml`: CloudNativePG `Cluster` spec configured with a single-instance Postgres database using Longhorn storage (5Gi) and auto-generating credentials.
- `deployment.yaml`: Deployment of pinned `ghcr.io/danieljcheung/agent-event-ledger` image digest with PSS-restricted pod and container security settings (UID/GID `10001`), `DATABASE_URL` sourced from the CloudNativePG generated app secret, and HTTP readiness/liveness probes.
- `service.yaml`: Service to expose the web server on port `8080`.
- `servicemonitor.yaml`: ServiceMonitor resource to enable Prometheus scraping of the `/metrics` endpoint.
- `networkpolicy.yaml`: NetworkPolicy to restrict ingress to the same namespace and the `monitoring` namespace for metrics collection.
- `kustomization.yaml`: Kustomize composition file.

## Operations

These resources are reconciled using Argo CD via the `agent-event-ledger` Application.

The image is currently pulled from a private GHCR package, so the namespace needs a runtime-only image pull secret named `ghcr-danieljcheung`. Keep that secret out of Git or add an encrypted SOPS version later.
