# Hardware and Goals

## Hardware

This homelab runs on compact Intel-based systems:

| Node | Role | Hardware |
| --- | --- | --- |
| `desktop-j7rbie4` | Control plane | Intel Core i5-8500T, 16GB RAM, 256GB SSD |
| `desktop-bvomtdn` | Worker | Dell OptiPlex 3070-class SFF, Intel Core i5 9th gen, 16GB RAM, 256GB SSD |

The first machine was well suited for a focused single-node Kubernetes cluster. The second machine expands the lab into a small multi-node cluster while keeping the design simple: one control plane node and one worker node.

## Why Talos Linux?

Talos Linux is a minimal, immutable operating system built specifically for Kubernetes.

Unlike Ubuntu Server, Talos does not expose normal SSH administration or a traditional package manager. The node is managed through the Talos API using `talosctl`, which makes the setup more similar to production-grade Kubernetes infrastructure.

## Why One Control Plane and One Worker?

The cluster started as a single-node Talos install so Kubernetes could be learned on real hardware without the overhead of virtualizing multiple nodes.

After adding the second physical machine, the cleaner two-node layout is:

- One control plane node for Kubernetes control-plane components
- One worker node for normal application workloads

Two control-plane nodes were intentionally avoided because etcd quorum would require both nodes to stay online. Proper highly available control planes should use three control-plane nodes.

Future upgrades could include:

- A third physical node for real control-plane HA
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
