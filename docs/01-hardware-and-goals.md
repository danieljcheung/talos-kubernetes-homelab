# Hardware and Goals

## Hardware

This homelab runs on a compact Intel-based system:

- Intel Core i5-8500T
- 16GB RAM
- 256GB SSD

The machine is powerful enough for a focused single-node Kubernetes cluster while staying lightweight and power-efficient.

## Why Single-Node k3s First?

Although Proxmox and multi-node Kubernetes are useful, this system has limited RAM and storage for multiple VMs. Starting with bare-metal Ubuntu Server and k3s keeps the setup simple and leaves more resources available for workloads.

A future upgrade to 32GB RAM and larger storage would make Proxmox or a multi-node virtualized lab more practical.

## Project Goals

The goal is to build practical infrastructure experience that connects directly to software engineering, cloud, DevOps, and security work.

Key outcomes:

- Learn Kubernetes by operating a real cluster
- Deploy real applications instead of toy-only examples
- Practice secure Linux administration
- Use GitHub as the source of truth for documentation and configuration
- Build a resume-ready infrastructure project
