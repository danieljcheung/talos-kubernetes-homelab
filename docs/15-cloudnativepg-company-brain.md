# CloudNativePG for Company Brain

Date: 2026-06-01

## Decision

Use CloudNativePG for the Company Brain Postgres database.

The database should run inside the Talos Kubernetes homelab, use Longhorn for persistent storage, and stay private inside the cluster. Staff should access the Company Brain web app over HTTPS through Cloudflare Tunnel, but Postgres must not be exposed publicly.

```text
Staff browser
  -> Cloudflare / HTTPS
  -> Cloudflare Tunnel
  -> Company Brain Next.js app
  -> internal Kubernetes service
  -> CloudNativePG Postgres
  -> Longhorn PVC
  -> Longhorn PVC + CloudNativePG object-store backups to R2
```

## What Was Done

Installed CloudNativePG on the cluster.

Created the `company-brain` namespace.

Created a SOPS-encrypted Kubernetes Secret manifest for `company-brain-db-user` in the `company-brain` namespace with:

- username: `company_brain_app`
- password: encrypted with SOPS, not committed in plaintext

Encrypted file:

```text
manifests/postgres/company-brain-db-user.secret.yaml
```

Apply command:

```bash
SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" \
  sops --decrypt manifests/postgres/company-brain-db-user.secret.yaml | kubectl apply -f -
```

Created a CloudNativePG `Cluster` named `company-brain-db`:

- namespace: `company-brain`
- instances: `1`
- database: `company_brain`
- owner: `company_brain_app`
- storage class: `longhorn`
- size: `10Gi`

Configured CloudNativePG/Barman object-store backups for the database:

- R2 destination: `s3://company-brain-sources/postgres-backups/`
- endpoint: Cloudflare R2 account endpoint
- credentials Secret: `company-brain-db-backup-r2`
- encrypted manifest: `manifests/postgres/company-brain-db-backup-r2.secret.yaml`
- schedule: daily at `07:00:00` via `ScheduledBackup/company-brain-db-daily`

Verification on 2026-06-15:

```text
Backup/company-brain-db-manual-test-2 phase: completed
```

Note: the first test against bucket `company-brain-postgres-backups` failed with R2 `AccessDenied`; the working target is the existing `company-brain-sources` bucket under the `postgres-backups/` prefix.

Production access is cluster-internal only. The Company Brain app uses the CloudNativePG read-write service:

```text
postgresql://company_brain_app:<password>@company-brain-db-rw.company-brain.svc.cluster.local:5432/company_brain?schema=public
```

Do not keep a long-running `kubectl port-forward` on local port `5432` for production. Use a short-lived port-forward only for manual maintenance/debugging, then stop it immediately:

```bash
kubectl port-forward -n company-brain svc/company-brain-db-rw 15432:5432
```

Applied the existing Prisma migration with:

```bash
npx prisma migrate deploy
npm run prisma:generate
```

Verified Prisma can connect to the migrated database and count the main tables.

## Prisma Note

`npm run prisma:migrate` runs `prisma migrate dev`, which connected successfully but failed because the app database user could not create a shadow database:

```text
permission denied to create database
```

That is expected and acceptable. The application user should not need broad database creation privileges.

For this cluster database, use:

```bash
npx prisma migrate deploy
```

## GitOps State

Committed manifests now live in:

```text
manifests/postgres/
manifests/argocd/apps/postgres.yaml
```

The password Secret and R2 backup credential Secret are committed only as SOPS-encrypted manifests. They are intentionally not referenced by `manifests/postgres/kustomization.yaml` because Argo CD does not decrypt SOPS files in the current setup.

## Current Limitations

This is a single Postgres instance on Longhorn. It gives persistent storage and a clean operator-managed database, but it is not highly available yet.

Before relying on this for production-like use:

- confirm Longhorn recurring backups apply to the database volume
- periodically restore-test CloudNativePG object-store backups from R2
- deploy the Company Brain app into Kubernetes
- expose only the web app through Cloudflare Tunnel / Cloudflare Access
- keep Postgres cluster-internal only
