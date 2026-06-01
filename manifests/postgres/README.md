# CloudNativePG Postgres

This directory contains the GitOps-managed, non-secret manifests for Postgres workloads.

Current workload:

- `company-brain-db`: CloudNativePG single-instance Postgres cluster for the Company Brain app
- Namespace: `company-brain`
- Database: `company_brain`
- Owner/user: `company_brain_app`
- Storage: Longhorn, 10Gi

The database user Secret is stored as a SOPS-encrypted manifest:

```text
manifests/postgres/company-brain-db-user.secret.yaml
```

Apply it from Dan's Mac before syncing the CloudNativePG cluster, or whenever the live Secret needs to be recreated:

```bash
SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" \
  sops --decrypt manifests/postgres/company-brain-db-user.secret.yaml | kubectl apply -f -
```

Do not add the encrypted Secret to `kustomization.yaml` until Argo CD has SOPS decryption support. In the current workflow, Argo CD manages non-secret manifests and Dan applies SOPS secrets manually from the trusted Mac.

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
