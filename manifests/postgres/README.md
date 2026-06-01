# CloudNativePG Postgres

This directory contains the GitOps-managed, non-secret manifests for Postgres workloads.

Current workload:

- `company-brain-db`: CloudNativePG single-instance Postgres cluster for the Company Brain app
- Namespace: `company-brain`
- Database: `company_brain`
- Owner/user: `company_brain_app`
- Storage: Longhorn, 10Gi

The database user Secret is intentionally not stored here in plaintext. Create or apply it separately before syncing the cluster manifest:

```bash
kubectl create namespace company-brain

kubectl create secret generic company-brain-db-user \
  -n company-brain \
  --from-literal=username=company_brain_app \
  --from-literal=password='<real-password>'
```

Later, convert that Secret to a SOPS-encrypted `*.secret.yaml` file.

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
