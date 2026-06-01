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
  -> Longhorn S3 backups
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

Created a local port-forward from Dan's Mac:

```bash
kubectl port-forward -n company-brain svc/company-brain-db-rw 5432:5432
```

Configured the Company Brain app to use:

```text
postgresql://company_brain_app:<password>@localhost:5432/company_brain?schema=public&sslmode=disable
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

The password Secret is committed only as a SOPS-encrypted manifest. It is intentionally not referenced by `manifests/postgres/kustomization.yaml` because Argo CD does not decrypt SOPS files in the current setup.

## Current Limitations

This is a single Postgres instance on Longhorn. It gives persistent storage and a clean operator-managed database, but it is not highly available yet.

Before relying on this for production-like use:

- confirm Longhorn recurring backups apply to the database volume
- add periodic `pg_dump` or CloudNativePG object-store backups
- deploy the Company Brain app into Kubernetes
- expose only the web app through Cloudflare Tunnel / Cloudflare Access
- keep Postgres cluster-internal only
