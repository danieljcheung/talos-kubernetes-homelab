# Homelab Kubernetes Cluster

A documented home lab project for learning Kubernetes, Linux server administration, networking, GitOps, monitoring, and security fundamentals on real hardware.

## Hardware

- **Machine:** Mini PC / small form factor homelab node
- **CPU:** Intel Core i5-8500T
- **RAM:** 16GB
- **Storage:** 256GB SSD
- **Network:** Ethernet recommended

## Goal

Build a practical single-node Kubernetes homelab using Ubuntu Server and k3s, then progressively add production-style tooling:

- Linux server setup and hardening
- Single-node k3s cluster
- Containerized workloads
- Private remote access with Tailscale
- GitOps deployment with Argo CD
- Ingress and TLS
- Monitoring and logs
- Security-focused experimentation

## Planned Architecture

```text
MacBook / Admin Machine
        |
        | SSH / kubectl / GitOps
        v
+-----------------------------+
| Homelab Node                |
| Intel i5-8500T              |
| 16GB RAM / 256GB SSD        |
| Ubuntu Server 24.04 LTS     |
| k3s single-node cluster     |
+-----------------------------+
        |
        +-- Core services
        +-- Test applications
        +-- Monitoring stack
        +-- Security lab workloads
```

## Initial Install Plan

1. Install Ubuntu Server 24.04 LTS
2. Enable OpenSSH during installation
3. Update system packages
4. Configure static/reserved network address
5. Install k3s
6. Configure kubectl access from admin machine
7. Deploy first test workload
8. Add GitOps with Argo CD
9. Add monitoring and documentation

## Documentation

- [Hardware and Goals](docs/01-hardware-and-goals.md)
- [Ubuntu Server Installation](docs/02-ubuntu-server-install.md)
- [Post-Install Setup](docs/03-post-install-setup.md)
- [k3s Installation](docs/04-k3s-install.md)
- [GitOps Roadmap](docs/05-gitops-roadmap.md)
- [Resume Notes](docs/resume-notes.md)

## Skills Demonstrated

- Linux server administration
- Kubernetes fundamentals
- Networking and SSH access
- Infrastructure documentation
- Git/GitHub project maintenance
- Homelab architecture planning
- Security-aware system setup

## Status

**Current phase:** Hardware acquired, Ubuntu Server installation planned.
