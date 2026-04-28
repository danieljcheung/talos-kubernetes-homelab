# Cloudflare Tunnel

This directory contains the Kubernetes manifest for running `cloudflared` inside the cluster.

## Current Purpose

Expose the personal website publicly without router port forwarding:

```text
danieljcheung.com / www.danieljcheung.com
  -> Cloudflare Tunnel
  -> nginx.default.svc.cluster.local:80
```

## Current State

- `danieljcheung.com` works.
- `www.danieljcheung.com` still needs Cloudflare DNS/tunnel hostname cleanup.
- The tunnel token is stored in a Kubernetes Secret and is not committed to Git.

## Required Namespace

```bash
kubectl create namespace cloudflare
```

## Required Secret

Create this manually from the Cloudflare tunnel token:

```bash
kubectl create secret generic cloudflare-tunnel-token \
  -n cloudflare \
  --from-literal=token='<CLOUDFLARE_TUNNEL_TOKEN>'
```

Never commit the token value.

## Apply

```bash
kubectl apply -f manifests/cloudflare-tunnel/deployment.yaml
```

## Verify

```bash
kubectl get pods -n cloudflare
kubectl logs -n cloudflare deploy/cloudflared
```

## Public Hostname Targets

In Cloudflare Zero Trust, both public hostnames should point to:

```text
http://nginx.default.svc.cluster.local:80
```
