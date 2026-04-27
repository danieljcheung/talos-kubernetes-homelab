# nginx Test Workload

This directory contains the first Kubernetes workload for the Talos homelab.

It replaces the initial manual `kubectl create deployment` test with declarative Kubernetes manifests that can later be managed by Argo CD.

## Apply Manually

```bash
kubectl apply -f manifests/nginx/
```

## Verify

```bash
kubectl get pods
kubectl get svc nginx
```

## Purpose

This workload validates the basic cluster path:

```text
Kubernetes Deployment → Pod → Service → NodePort → LAN browser access
```

Later, this same workload can be used as the first GitOps-managed app.
