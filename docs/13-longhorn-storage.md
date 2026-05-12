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

Operational issue encountered: the control-plane node `10.0.0.97` had `siderolabs/iscsi-tools`, but the worker node `10.0.0.36` / `desktop-bvomtdn` initially did not. Longhorn pre-upgrade checks failed until the worker was upgraded with the same iSCSI-enabled Talos schematic. Every schedulable node needs the extension before Longhorn can safely attach volumes there.

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


## AWS S3 Backup Target

Longhorn snapshots protect against some application mistakes, but they still live inside the cluster. The production-style storage milestone was to add an external backup target so PVC data can be recovered if a node, disk, or Longhorn volume is lost.

This cluster now uses an AWS S3 backup target configured through Longhorn's `BackupTarget` custom resource:

```text
BackupTarget/default
```

Important Longhorn v1.11 note: backup target configuration is managed through the `BackupTarget` CR, not the older legacy `Setting` CRs. For this cluster, the working configuration was created by updating `BackupTarget/default` and referencing an S3 credential Secret in `longhorn-system`.

Keep the following out of Git:

- AWS access key ID and secret access key
- real bucket names or private prefixes, if they should not be public
- local values/manifests under `local/`

A sanitized example backup target manifest lives at:

```text
manifests/longhorn/backup-target-values.example.yaml
```

Apply only after replacing placeholders in a local, uncommitted copy. The live cluster should show `BackupTarget/default` as available before relying on recurring backup jobs.

Useful checks:

```bash
kubectl -n longhorn-system get backuptarget.longhorn.io default -o yaml
kubectl -n longhorn-system get backups.longhorn.io
```


## Recurring Snapshot and Backup Jobs

After the backup target is reachable, add simple recurring protection:

- daily local snapshots, retained for 7 days
- weekly external backups, retained for 4 weeks

Example jobs live at:

```text
manifests/longhorn/recurring-jobs.example.yaml
```

Apply the examples after reviewing the schedule and retention:

```bash
kubectl apply -f manifests/longhorn/recurring-jobs.example.yaml
kubectl -n longhorn-system get recurringjobs.longhorn.io
```

Then attach the jobs to selected volumes through the Longhorn UI or by assigning the matching recurring job group to a StorageClass/volume. For a homelab portfolio, it is enough to show the schedule, retention, target, and one successful backup artifact.

## Restore Test Performed

I verified the S3 backup target with a disposable Longhorn volume restore.

Test result:

```text
Restored Longhorn volume: long-horn-test-backup
Verified marker: restore-test-20260512-202740
```

Validation flow:

1. Created test PVC data on a Longhorn-backed volume.
2. Wrote marker `restore-test-20260512-202740` into the mounted data path.
3. Created a Longhorn external backup to AWS S3.
4. Restored that backup into a new Longhorn volume named `long-horn-test-backup`.
5. Mounted the restored volume through a Kubernetes PV/PVC.
6. Read the restored marker from the pod and confirmed it matched the original value.

Success criteria met:

```text
A Longhorn volume was restored from the AWS S3 backup target into a new PVC, and the restored pod read the original marker file.
```


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

- enable recurring snapshots/backups for selected volumes
- expose Longhorn UI privately over Tailscale if not already private
- increase replica count after adding more physical nodes
- document the multi-node storage plan
- periodically repeat restore tests for real stateful workloads
