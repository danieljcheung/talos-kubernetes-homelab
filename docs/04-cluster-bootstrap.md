# Cluster Bootstrap

## Generate Cluster Configuration

From the admin workstation:

```bash
talosctl gen config homelab-k8s https://<NODE-IP>:6443
```

This generates machine configuration files and a Talos client config.

## Apply Control Plane Configuration

```bash
talosctl apply-config --insecure --nodes <NODE-IP> --file controlplane.yaml
```

## Bootstrap Kubernetes

```bash
talosctl bootstrap --nodes <NODE-IP> --endpoints <NODE-IP>
```

## Get kubeconfig

```bash
talosctl kubeconfig --nodes <NODE-IP> --endpoints <NODE-IP>
```

## Verify Cluster

```bash
kubectl get nodes
```

Expected result: one Kubernetes node in the `Ready` state.

## First Workload Test

```bash
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl get pods
kubectl get svc
```
