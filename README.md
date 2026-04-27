# Talos Kubernetes Homelab

This repository documents my bare-metal Kubernetes homelab built with **Talos Linux** on a small form factor PC.

The goal of this project is to learn Kubernetes and platform engineering by running a real cluster on real hardware, not just local containers or cloud tutorials. I chose Talos Linux because it is purpose-built for Kubernetes, immutable, API-managed, and closer to modern production infrastructure than a traditional Ubuntu server install.

## Current Status

✅ Hardware acquired  
✅ Talos Linux booted from USB  
✅ Talos installed to the internal SSD  
✅ Single-node Kubernetes cluster bootstrapped  
✅ First nginx workload deployed and exposed with NodePort  
⏭️ Next: publish repo, install Argo CD, and move workloads into GitOps

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
        +-- Test applications
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
- [Build Log](docs/build-log.md)
- [nginx Test Workload](manifests/nginx/README.md)
- [Resume Notes](docs/resume-notes.md)

## Skills Demonstrated

- Kubernetes administration
- Talos Linux / immutable infrastructure
- Bare-metal cluster operations
- `talosctl` and `kubectl`
- Linux/Kubernetes networking concepts
- Infrastructure documentation
- GitOps planning
- Security-aware system design

## Next Steps

- Publish this documentation repository publicly on GitHub
- Convert the first workload into Git-managed manifests
- Install Argo CD for GitOps
- Add private access with Tailscale in-cluster
- Add monitoring and dashboards
- Deploy security-focused workloads for experimentation
