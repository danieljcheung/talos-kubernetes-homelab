# Talos Kubernetes Homelab

A documented bare-metal Kubernetes homelab built with **Talos Linux**, focused on immutable infrastructure, Kubernetes operations, GitOps, networking, monitoring, and security-aware system administration.

## Hardware

- **Machine:** Mini PC / small form factor homelab node
- **CPU:** Intel Core i5-8500T
- **RAM:** 16GB
- **Storage:** 256GB SSD
- **Network:** Ethernet recommended

## Goal

Build a practical Kubernetes homelab on real hardware using Talos Linux instead of a traditional general-purpose Linux server.

Talos is designed specifically for Kubernetes. It is immutable, API-managed, minimal, and more production-like than a normal Ubuntu install.

## Planned Architecture

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

- Purpose-built for Kubernetes
- Immutable operating system
- No SSH or package manager on the node
- Managed through `talosctl`
- Smaller attack surface than a traditional Linux server
- Strong resume signal for Kubernetes/platform engineering

## Initial Install Plan

1. Download Talos Linux metal image
2. Boot the homelab machine from USB
3. Generate Talos machine configuration
4. Install Talos to the internal SSD
5. Bootstrap the single-node Kubernetes cluster
6. Configure `kubectl` from the admin machine
7. Deploy a test workload
8. Add GitOps with Argo CD
9. Add monitoring, ingress, and security-focused workloads

## Documentation

- [Hardware and Goals](docs/01-hardware-and-goals.md)
- [Talos Linux Installation](docs/02-talos-linux-install.md)
- [Admin Workstation Setup](docs/03-admin-workstation-setup.md)
- [Cluster Bootstrap](docs/04-cluster-bootstrap.md)
- [GitOps Roadmap](docs/05-gitops-roadmap.md)
- [Resume Notes](docs/resume-notes.md)

## Skills Demonstrated

- Kubernetes administration
- Talos Linux / immutable infrastructure
- Bare-metal cluster operations
- Infrastructure-as-code style documentation
- GitOps planning
- Networking and cluster access
- Security-aware system design

## Status

**Current phase:** Hardware acquired, Talos Linux installation planned.
