# Talos Linux Installation

## Overview

Talos Linux is installed differently from Ubuntu Server. Instead of logging into the machine with SSH, the node is configured from an admin workstation using `talosctl`.

## Initial Control Plane Install Flow

1. Download the Talos Linux metal ISO
2. Flash it to a USB drive
3. Boot the first homelab machine from USB
4. Find the node IP address
5. Generate machine configuration files from the admin workstation
6. Apply the control plane configuration
7. Install Talos to the internal SSD
8. Reboot into the installed system

## Adding a Worker Node

For additional worker nodes, reuse the original cluster bundle/secrets and apply the matching `worker.yaml` from that bundle.

```bash
talosctl apply-config --insecure \
  --nodes <worker-node-ip> \
  --file ~/worker.yaml
```

Do not generate a brand-new Talos config bundle for a node that should join the existing cluster. A newly generated bundle has different cluster secrets and will not match the original control plane.

## Adding Another Control Plane Node

When adding control-plane nodes to the existing cluster, reuse the original `controlplane.yaml` from the same cluster bundle/secrets. Do not run `talosctl bootstrap` on the new node; bootstrap is only for the first control-plane node during initial cluster creation.

```bash
talosctl apply-config --insecure \
  --nodes <new-node-ip> \
  --file ~/controlplane.yaml
```

After the node joins, verify Kubernetes and etcd membership:

```bash
kubectl get nodes -o wide

talosctl --talosconfig ~/talosconfig \
  --nodes <existing-control-plane-ip> \
  --endpoints <existing-control-plane-ip> \
  etcd members
```

For a homelab where control-plane nodes should also run workloads, keep scheduling enabled:

```yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

If Kubernetes still taints a control-plane node, remove the taint:

```bash
kubectl taint node <node-name> node-role.kubernetes.io/control-plane- || true
```

## Important Notes

- Talos has no traditional SSH login
- Talos does not use `apt`, `yum`, or normal Linux package management
- Configuration is declarative and applied through the Talos API
- The admin machine needs both `talosctl` and `kubectl`

## Recommended Install Target

Install Talos to the internal 256GB SSD.

Current intended layout:

- `desktop-j7rbie4` — control plane
- `desktop-bvomtdn` — being rebuilt from worker to control plane
- third node — new control plane, hostname pending

The cluster started as a single-node setup where the control plane also ran workloads. After adding the second machine, normal app workloads could be scheduled onto the worker node. With three physical nodes available, the target state is three schedulable control-plane nodes.

## 2026-05-25 Dell OptiPlex Rebuild Notes

During the worker-to-control-plane rebuild, the Dell OptiPlex at `10.0.0.36` exposed a few practical Talos installation issues:

- `no route to host` / `i/o timeout` on `10.0.0.36:50000` meant the admin machine could not reach the Talos API yet.
- `tls: certificate required` meant the node was reachable but already configured, so insecure maintenance-mode access was not accepted.
- When booting with the USB inserted, the machine was running Talos from USB rather than the internal SSD.
- Dell firmware showed `Windows Boot Manager`, `Onboard NIC IPv4`, and `Onboard NIC IPv6`; the NIC entries are PXE/network boot and cause `Checking media presence`.
- `talosctl get disks --nodes 10.0.0.36 --insecure` showed the internal Samsung SSD as `/dev/sda` and the USB drive as `/dev/sdb`.
- The local `/Users/dan/controlplane.yaml` originally targeted `/dev/nvme0n1`, which does not exist on this Dell. It was patched locally to target `/dev/sda`.

The safe apply command for the USB-booted OptiPlex is:

```bash
talosctl apply-config --nodes 10.0.0.36 --insecure \
  --file /Users/dan/controlplane.yaml
```

After applying, reboot, remove the USB stick, and boot from the internal disk entry. Do not choose the onboard NIC IPv4/IPv6 entries.
