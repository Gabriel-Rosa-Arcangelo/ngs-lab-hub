#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Starting containers"
docker compose up -d --build

echo "[2/4] Applying migrations"
docker compose exec web python manage.py migrate

echo "[3/4] Seeding demo user + NGS samples"
docker compose exec web python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.accounts.models import Profile
from apps.ngs.models import NgsSequence

User = get_user_model()
user, _ = User.objects.get_or_create(username='demo', defaults={'email': 'demo@example.com'})
user.email = 'demo@example.com'
user.set_password('demo1234')
user.save()

profile = user.profile
profile.role = Profile.Role.ADMIN
profile.save(update_fields=['role'])

samples = [
    {
        'sample_id': 'DEMO-NGS-001',
        'sequence': 'ACGTACGTACGTACGT',
        'platform': 'ILLUMINA',
        'raw_reads': 1600000,
        'trimmed_reads': 1420000,
        'aligned_reads': 1310000,
        'read_length': 150,
        'q30_rate_percent': 92.1,
        'mean_depth': 87.4,
        'variant_count': 104,
        'pipeline_status': NgsSequence.PipelineStatus.SUCCEEDED,
        'created_by': user,
    },
    {
        'sample_id': 'DEMO-NGS-002',
        'sequence': 'TTGGCCAATTGGCCAA',
        'platform': 'ILLUMINA',
        'raw_reads': 980000,
        'trimmed_reads': 860000,
        'aligned_reads': 760000,
        'read_length': 150,
        'q30_rate_percent': 89.9,
        'mean_depth': 63.8,
        'variant_count': 74,
        'pipeline_status': NgsSequence.PipelineStatus.RUNNING,
        'created_by': user,
    },
    {
        'sample_id': 'DEMO-NGS-003',
        'sequence': 'GATTACAGATTACA',
        'platform': 'ONT',
        'raw_reads': 550000,
        'trimmed_reads': 500000,
        'aligned_reads': 430000,
        'read_length': 250,
        'q30_rate_percent': 87.2,
        'mean_depth': 41.3,
        'variant_count': 31,
        'pipeline_status': NgsSequence.PipelineStatus.QUEUED,
        'created_by': user,
    },
]

for sample in samples:
    sample_id = sample.pop('sample_id')
    NgsSequence.objects.update_or_create(sample_id=sample_id, defaults=sample)

print('demo_seed_ok')
"

echo "[4/4] Queueing sample exports"
docker compose exec web python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.exports.models import ExportJob
from apps.exports.tasks import generate_export

User = get_user_model()
user = User.objects.get(username='demo')

jobs = [
    (ExportJob.Kind.NGS_TRIMMING_REPORT, ExportJob.FileFormat.CSV),
    (ExportJob.Kind.NGS_PIPELINE_REPORT, ExportJob.FileFormat.ZIP),
]

for kind, file_format in jobs:
    job = ExportJob.objects.create(
        created_by=user,
        kind=kind,
        file_format=file_format,
        params={'days': 30},
    )
    generate_export.delay(str(job.id))

print('demo_exports_queued')
"

echo ""
echo "Demo environment is ready."
echo "Credentials: demo / demo1234"
echo ""
echo "Next:"
echo "  cd frontend"
echo "  npm install"
echo "  npm run dev"
echo ""
echo "Open: http://localhost:5173/demo"
