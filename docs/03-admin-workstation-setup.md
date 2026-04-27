# Admin Workstation Setup

The admin workstation is used to manage both Talos and Kubernetes.

For this project, the admin machine is expected to be a MacBook.

## Required Tools

- `talosctl`
- `kubectl`
- Git

## Install Tools on macOS

```bash
brew install siderolabs/tap/talosctl
brew install kubectl
```

## Verify Tools

```bash
talosctl version --client
kubectl version --client
```

## Working Directory

Talos configuration files should be stored carefully. They contain cluster secrets and should not be committed publicly unless sanitized.

Recommended local-only structure:

```text
private/
  talosconfig
  controlplane.yaml
  worker.yaml
```

The `private/` directory should be ignored by Git.
