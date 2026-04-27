# Argo CD GitOps Setup

This document records the first GitOps setup for the Talos Kubernetes homelab.

## Purpose

Argo CD is used to make GitHub the source of truth for Kubernetes workloads.

Instead of manually applying resources with `kubectl`, Kubernetes manifests are committed to GitHub and Argo CD syncs them into the cluster.

## Architecture

```text
GitHub repository
        ↓
Argo CD application
        ↓
Kubernetes manifests
        ↓
Talos Kubernetes cluster
```

## Installation

Create the Argo CD namespace:

```bash
kubectl create namespace argocd
```

Install the official Argo CD manifests:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Verify pods:

```bash
kubectl get pods -n argocd
```

## Accessing the UI

Port-forward the Argo CD API/UI service:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open:

```text
https://localhost:8080
```

The browser may show a certificate warning because this is local access with a self-signed certificate.

## First Application

The first Argo CD application deploys the nginx test workload from this repository.

Application settings:

```text
Application name: nginx
Project: default
Repository: https://github.com/danieljcheung/talos-kubernetes-homelab.git
Revision: HEAD
Path: manifests/nginx
Cluster: https://kubernetes.default.svc
Namespace: default
Sync policy: Manual
```

## Current GitOps Flow

```text
Commit Kubernetes YAML to GitHub
        ↓
Argo CD detects the repository state
        ↓
Manual sync applies the manifests
        ↓
Cluster state matches Git
```

## Next Improvements

- Replace nginx with a custom homelab landing page
- Enable auto-sync after manual sync is fully understood
- Add screenshots of Argo CD synced/healthy state
- Add Tailscale for private access
- Add monitoring and observability
