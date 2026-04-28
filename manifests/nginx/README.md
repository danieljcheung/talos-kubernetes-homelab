# nginx Personal Website

This directory contains Daniel Cheung's personal website served by nginx inside Kubernetes.

Argo CD watches this directory through the `nginx` app, so commits to GitHub become the desired state for the live site.

## Current State

- Static site files are stored in `configmap.yaml`:
  - `index.html`
  - `styles.css`
- `deployment.yaml` mounts both files into nginx's web root.
- `service.yaml` exposes nginx internally as a `ClusterIP` service.
- Public access is handled by Cloudflare Tunnel instead of NodePort/router port forwarding.
- `https://danieljcheung.com` works.
- `https://www.danieljcheung.com` still needs Cloudflare hostname/DNS cleanup.

## Deployment Model

```text
GitHub
  -> Argo CD
  -> manifests/nginx
  -> ConfigMap + Deployment + ClusterIP Service
  -> nginx pod
  -> Cloudflare Tunnel
  -> danieljcheung.com
```

## Verify In-Cluster Site

```bash
kubectl get pods -l app=nginx
kubectl get svc nginx
kubectl port-forward svc/nginx 8080:80
```

Then open:

```text
http://localhost:8080
```

## Files

- `configmap.yaml`: website `index.html` and `styles.css`
- `deployment.yaml`: nginx deployment mounting both files
- `service.yaml`: internal HTTP service for Cloudflare Tunnel routing
