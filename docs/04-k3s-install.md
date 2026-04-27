# k3s Installation

k3s is a lightweight Kubernetes distribution designed for smaller systems, edge devices, and homelabs.

## Basic Install

```bash
curl -sfL https://get.k3s.io | sh -
```

## Verify Cluster

```bash
sudo k3s kubectl get nodes
```

Expected result: one node in the `Ready` state.

## kubeconfig

The kubeconfig file is located at:

```bash
/etc/rancher/k3s/k3s.yaml
```

Later, this can be copied to an admin machine so `kubectl` can manage the cluster remotely.

## Notes

For the first version of the lab, the default k3s setup is acceptable. In later iterations, ingress, storage, and GitOps can be customized.
