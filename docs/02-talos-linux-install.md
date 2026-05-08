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

## Important Notes

- Talos has no traditional SSH login
- Talos does not use `apt`, `yum`, or normal Linux package management
- Configuration is declarative and applied through the Talos API
- The admin machine needs both `talosctl` and `kubectl`

## Recommended Install Target

Install Talos to the internal 256GB SSD.

Current intended layout:

- `desktop-j7rbie4` — control plane
- `desktop-bvomtdn` — worker

The cluster started as a single-node setup where the control plane also ran workloads. After adding the second machine, normal app workloads can be scheduled onto the worker node.
