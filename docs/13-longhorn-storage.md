# Longhorn Storage

This phase adds Kubernetes-native persistent storage to the Talos homelab with Longhorn.

## Goal

I wanted a storage layer that works now on a single node but can grow with the cluster later.

Longhorn gives me:

- dynamic PersistentVolumeClaim provisioning
- a Kubernetes-native storage UI
- volume snapshots/backups later
- a path toward replicated storage when I add more physical nodes

Current limitation:

```text
single node + Longhorn replica count 1 = persistent storage, not high availability
```

If the only node or disk dies, Longhorn cannot save the data by itself. Backups are still required.

## Talos Requirement: iSCSI Extension

Longhorn needs `iscsiadm` / open-iscsi support on every node.

On Talos, this is provided through the official system extension:

```text
siderolabs/iscsi-tools
```

I created a Talos Image Factory schematic:

```yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
```

Then upgraded the node to a Talos installer image built from that schematic.

Verify the extension after reboot:

```bash
talosctl get extensions \
  --nodes 10.0.0.97 \
  --endpoints 10.0.0.97
```

## Namespace Pod Security

Longhorn needs privileged host access. Keep that scoped to the Longhorn namespace only:

```bash
kubectl create namespace longhorn-system
kubectl label namespace longhorn-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged \
  --overwrite
```

Do not weaken Pod Security globally.

## Helm Install

Add/update the Helm repo:

```bash
helm repo add longhorn https://charts.longhorn.io
helm repo update
```

Values live at:

```text
manifests/longhorn/values.yaml
```

Current single-node values:

```yaml
defaultSettings:
  defaultReplicaCount: 1

persistence:
  defaultClass: true
  defaultClassReplicaCount: 1

longhornUI:
  replicas: 1
```

Install/upgrade:

```bash
helm upgrade --install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  -f manifests/longhorn/values.yaml
```

Watch pods:

```bash
kubectl -n longhorn-system get pods -w
```

## Useful Longhorn Commands

Check Longhorn pods:

```bash
kubectl -n longhorn-system get pods
```

Check Longhorn events:

```bash
kubectl -n longhorn-system get events --sort-by=.lastTimestamp | tail -50
```

Check storage classes:

```bash
kubectl get storageclass
```

Check PVCs in all namespaces:

```bash
kubectl get pvc -A
```

Check PVs:

```bash
kubectl get pv
```

Describe a stuck PVC:

```bash
kubectl describe pvc <pvc-name> -n <namespace>
```

Describe a Longhorn volume CR:

```bash
kubectl -n longhorn-system get volumes.longhorn.io
kubectl -n longhorn-system describe volumes.longhorn.io <volume-name>
```

Check Longhorn manager logs:

```bash
kubectl -n longhorn-system logs -l app=longhorn-manager --tail=100
```

## Creating a PVC

Example PVC using Longhorn:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi
```

Apply it:

```bash
kubectl apply -f example-pvc.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/example-data --timeout=120s
kubectl get pvc example-data
```

## Mounting a PVC in a Pod

Example pod mounting the PVC at `/data`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pvc-test
  namespace: default
spec:
  containers:
    - name: busybox
      image: busybox:1.36
      command: ["sh", "-c", "echo hello-longhorn > /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: example-data
```

## Persistence Test Performed

Test manifest:

```text
manifests/longhorn/pvc-test.yaml
```

I verified:

1. created a Longhorn-backed PVC
2. wrote `hello-longhorn` to `/data/test.txt` from one pod
3. deleted that pod
4. mounted the same PVC in a second pod
5. confirmed the file was still present

Result:

```text
hello-longhorn
hello-longhorn
```

This confirms Longhorn can provision a PVC and persist data across pod replacement.

## Cleanup Test Resources

Remove test pods:

```bash
kubectl delete pod longhorn-test longhorn-test-reader --ignore-not-found
```

Remove test PVC and its Longhorn volume:

```bash
kubectl delete pvc longhorn-test-pvc
```

## Future Work

- expose Longhorn UI privately over Tailscale
- configure recurring snapshots
- configure backup target, likely external disk or object storage
- test restore from backup
- increase replica count after adding more physical nodes
- document the multi-node storage plan
