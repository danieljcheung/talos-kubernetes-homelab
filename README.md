# Talos Kubernetes Homelab

This repository documents my bare-metal Kubernetes homelab built with **Talos Linux** on a small form factor PC.

The goal of this project is to learn Kubernetes and platform engineering by running a real cluster on real hardware, not just local containers or cloud tutorials. I chose Talos Linux because it is purpose-built for Kubernetes, immutable, API-managed, and closer to modern production infrastructure than a traditional Ubuntu server install.

## Current Status

✅ Hardware acquired  
✅ Talos Linux booted from USB  
✅ Talos installed to the internal SSD  
✅ Single-node Kubernetes cluster bootstrapped  
✅ First nginx workload deployed and exposed with NodePort  
✅ Public GitHub repository published  
✅ Argo CD installed inside the cluster  
✅ First GitOps app synced from GitHub  
✅ Private Argo CD access configured over Tailscale  
✅ Headlamp dashboard installed and exposed privately over Tailscale  
✅ Personal website deployed through GitOps-managed nginx  
✅ Cloudflare Tunnel serving `danieljcheung.com` without router port forwarding  
⚠️ `www.danieljcheung.com` still needs DNS/tunnel hostname cleanup  
⏭️ Next: fix `www`, then deploy n8n + Postgres through GitOps

## Hardware

- **Machine:** Mini PC / small form factor homelab node
- **CPU:** Intel Core i5-8500T
- **RAM:** 16GB
- **Storage:** 256GB SSD
- **Network:** Ethernet

## Architecture

```text
MacBook / Admin Machine
        |
        | talosctl / kubectl / GitOps
        v
+-----------------------------+
| Homelab Node                |
| Intel i5-8500T              |
| 16GB RAM / 256GB SSD        |
| Talos Linux                 |
| Single-node Kubernetes      |
+-----------------------------+
        |
        +-- Core Kubernetes services
        +-- Personal website via nginx
        +-- Cloudflare Tunnel for public site traffic
        +-- GitOps with Argo CD
        +-- Monitoring stack
        +-- Security lab workloads
```

## Why Talos?

I originally considered Ubuntu Server with k3s, but decided to use Talos Linux because it gives the project a stronger infrastructure focus.

Talos is different from a normal Linux server:

- No SSH into the node
- No traditional package manager
- Minimal immutable operating system
- Managed through `talosctl`
- Designed specifically for Kubernetes
- Smaller attack surface
- Better fit for learning modern Kubernetes operations

## Setup Journey

The machine arrived with Windows preinstalled, so the first major step was wiping the internal drive and replacing it with Talos Linux.

High-level process:

1. Downloaded the Talos `metal-amd64.iso`
2. Flashed it to a USB drive with Raspberry Pi Imager
3. Booted the homelab machine from USB
4. Found the node IP on the Talos dashboard
5. Generated Talos machine configs from my Mac
6. Enabled scheduling on the control plane for a single-node cluster
7. Applied the Talos control plane config
8. Installed Talos to the internal SSD
9. Rebooted into the installed system
10. Bootstrapped Kubernetes
11. Confirmed the cluster was up with `kubectl`

## Documentation

- [Hardware and Goals](docs/01-hardware-and-goals.md)
- [Talos Linux Installation](docs/02-talos-linux-install.md)
- [Admin Workstation Setup](docs/03-admin-workstation-setup.md)
- [Cluster Bootstrap](docs/04-cluster-bootstrap.md)
- [GitOps Roadmap](docs/05-gitops-roadmap.md)
- [Argo CD GitOps Setup](docs/06-argocd-gitops.md)
- [Private Access with Tailscale](docs/07-tailscale-private-access.md)
- [Kubernetes Dashboards](docs/08-kubernetes-dashboards.md)
- [Personal Website and Cloudflare Tunnel](docs/09-personal-site-cloudflare.md)
- [Build Log](docs/build-log.md)
- [nginx Personal Website](manifests/nginx/README.md)
- [Cloudflare Tunnel Manifests](manifests/cloudflare-tunnel/README.md)
- [Resume Notes](docs/resume-notes.md)

## Skills Demonstrated

- Kubernetes administration
- Talos Linux / immutable infrastructure
- Bare-metal cluster operations
- `talosctl` and `kubectl`
- Linux/Kubernetes networking concepts
- Infrastructure documentation
- GitOps with Argo CD
- Private admin access with Tailscale
- Kubernetes dashboard operations with Headlamp
- Static website hosting on Kubernetes
- Cloudflare Tunnel public access without port forwarding
- Security-aware system design

## Next Steps

- Fix `www.danieljcheung.com` Cloudflare hostname/DNS routing
- Pin and harden the `cloudflared` deployment
- Deploy n8n and Postgres through GitOps
- Add backup/restore workflows for persistent data
- Add monitoring and alerting
- Deploy security-focused workloads for experimentation
