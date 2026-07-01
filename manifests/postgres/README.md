# CloudNativePG Postgres

This directory contains the GitOps-managed, non-secret manifests for Postgres workloads, plus SOPS-encrypted Secret manifests that are applied manually from Dan's Mac.

Current workload:

- `company-brain-db`: CloudNativePG single-instance Postgres cluster for the Company Brain app
- Namespace: `company-brain`
- Database: `company_brain`
- Owner/user: `company_brain_app`
- Storage: Longhorn, 10Gi
- Object-store backups: CloudNativePG/Barman to Cloudflare R2 at `s3://company-brain-sources/postgres-backups/`
- Scheduled backup: `company-brain-db-daily` at `07:00:00`

The database user Secret and R2 backup credential Secret are stored as SOPS-encrypted manifests:

```text
manifests/postgres/company-brain-db-user.secret.yaml
manifests/postgres/company-brain-db-backup-r2.secret.yaml
```

Apply them from Dan's Mac before syncing the CloudNativePG cluster, or whenever the live Secrets need to be recreated:

```bash
SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" \
  sops --decrypt manifests/postgres/company-brain-db-user.secret.yaml | kubectl apply -f -
SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" \
  sops --decrypt manifests/postgres/company-brain-db-backup-r2.secret.yaml | kubectl apply -f -
```

Do not add encrypted Secret manifests to `kustomization.yaml` until Argo CD has SOPS decryption support. In the current workflow, Argo CD manages non-secret manifests and Dan applies SOPS secrets manually from the trusted Mac.

Backup verification:

```bash
kubectl -n company-brain get scheduledbackup company-brain-db-daily
kubectl -n company-brain get backups.postgresql.cnpg.io
```

Manual backup test completed on 2026-06-15 with `Backup/company-brain-db-manual-test-2` reaching `completed`.

Local migration flow from Dan's Mac:

```bash
kubectl port-forward -n company-brain svc/company-brain-db-rw 5432:5432
```

Then in the Company Brain app repo:

```bash
DATABASE_URL='postgresql://company_brain_app:<password>@localhost:5432/company_brain?schema=public&sslmode=disable'
npx prisma migrate deploy
npm run prisma:generate
```

Use `migrate deploy` against this cluster DB. `prisma migrate dev` tries to create a shadow database and fails unless the app user has `CREATE DATABASE`, which it should not need.
