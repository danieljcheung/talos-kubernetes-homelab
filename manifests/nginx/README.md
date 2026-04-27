# nginx Landing Page

This directory contains the lightweight nginx landing page for Daniel's Talos Kubernetes Homelab.

Argo CD should continue syncing this application directly from `manifests/nginx`. The page HTML is stored in a Kubernetes `ConfigMap`, and the nginx deployment mounts that file into `/usr/share/nginx/html/index.html` by using `subPath`.

## Apply Manually

```bash
kubectl apply -f manifests/nginx/
```

## Verify

```bash
kubectl get pods
kubectl get svc nginx
kubectl get configmap nginx-landing-page
```

Then open the nginx `NodePort` in a browser to confirm the custom landing page is being served.

## Deployment Model

```text
GitHub -> Argo CD -> manifests/nginx -> Deployment + ConfigMap -> nginx Pod -> NodePort
```

## Files

- `configmap.yaml`: self-contained `index.html` with inline CSS for the landing page
- `deployment.yaml`: nginx deployment mounting the ConfigMap file at the default web root
- `service.yaml`: existing `NodePort` service for LAN access
