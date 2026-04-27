# Talos Linux Installation

## Overview

Talos Linux is installed differently from Ubuntu Server. Instead of logging into the machine with SSH, the node is configured from an admin workstation using `talosctl`.

## Install Flow

1. Download the Talos Linux metal ISO
2. Flash it to a USB drive
3. Boot the homelab machine from USB
4. Find the node IP address
5. Generate machine configuration files from the admin workstation
6. Apply the control plane configuration
7. Install Talos to the internal SSD
8. Reboot into the installed system

## Important Notes

- Talos has no traditional SSH login
- Talos does not use `apt`, `yum`, or normal Linux package management
- Configuration is declarative and applied through the Talos API
- The admin machine needs both `talosctl` and `kubectl`

## Recommended Install Target

Install Talos to the internal 256GB SSD.

Because this is a single-node cluster, the node will act as both:

- Kubernetes control plane
- Kubernetes worker
