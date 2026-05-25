# Hardware and Goals

## Hardware

This homelab runs on compact Intel-based systems:

| Node | Role | Hardware |
| --- | --- | --- |
| `desktop-j7rbie4` | Control plane | Intel Core i5-8500T, 16GB RAM, 256GB SSD |
| `desktop-bvomtdn` | Worker, being rebuilt as control plane | Dell OptiPlex 3070-class SFF, Intel Core i5 9th gen, 16GB RAM, 256GB SSD |
| Hostname pending | New control plane | 32GB RAM, 1TB storage |

The first machine was well suited for a focused single-node Kubernetes cluster. The second machine expanded the lab into a small multi-node cluster. With a third physical node available, the target design is now three control-plane nodes that are also schedulable for normal homelab workloads.

## Why Talos Linux?

Talos Linux is a minimal, immutable operating system built specifically for Kubernetes.

Unlike Ubuntu Server, Talos does not expose normal SSH administration or a traditional package manager. The node is managed through the Talos API using `talosctl`, which makes the setup more similar to production-grade Kubernetes infrastructure.

## Why Move to Three Control Planes?

The cluster started as a single-node Talos install so Kubernetes could be learned on real hardware without the overhead of virtualizing multiple nodes.

After adding the second physical machine, the cleaner two-node layout was:

- One control plane node for Kubernetes control-plane components
- One worker node for normal application workloads

Two control-plane nodes were intentionally avoided because etcd quorum would require both nodes to stay online. Proper highly available control planes should use three control-plane nodes.

Now that a third physical node is available, the target layout is:

- Node 1: control plane + worker workloads
- Node 2: control plane + worker workloads
- Node 3: control plane + worker workloads

This gives etcd a three-member quorum while keeping all machines useful for applications. The highest-capacity node should carry heavier workloads and storage, but the cluster should not depend on only that node.

Future upgrades could include:

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
