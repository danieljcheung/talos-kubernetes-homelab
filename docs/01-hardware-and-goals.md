# Hardware and Goals

## Hardware

This homelab runs on a compact Intel-based system:

- Intel Core i5-8500T
- 16GB RAM
- 256GB SSD

The machine is well suited for a focused single-node Kubernetes cluster. The limited RAM and storage make a bare-metal Kubernetes operating system a better starting point than a virtualized Proxmox-based lab.

## Why Talos Linux?

Talos Linux is a minimal, immutable operating system built specifically for Kubernetes.

Unlike Ubuntu Server, Talos does not expose normal SSH administration or a traditional package manager. The node is managed through the Talos API using `talosctl`, which makes the setup more similar to production-grade Kubernetes infrastructure.

## Why Single-Node First?

A single-node cluster is the best first step for this hardware because it avoids the overhead of multiple VMs while still providing real Kubernetes experience.

Future upgrades could include:

- Additional physical nodes
- More RAM
- Larger SSD/NVMe storage
- Dedicated NAS or external storage
- Multi-node high availability cluster design

## Project Goals

- Build and operate a real Kubernetes cluster
- Learn Talos Linux and immutable infrastructure concepts
- Practice Kubernetes networking, workloads, and GitOps
- Document the process clearly for GitHub and resume use
- Add monitoring, ingress, and security-focused workloads over time
