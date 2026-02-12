from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NgsSequence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sample_id", models.CharField(max_length=64, unique=True)),
                ("sequence", models.TextField()),
                ("platform", models.CharField(default="ILLUMINA", max_length=32)),
                ("raw_reads", models.IntegerField(default=0)),
                ("trimmed_reads", models.IntegerField(default=0)),
                ("aligned_reads", models.IntegerField(default=0)),
                ("read_length", models.IntegerField(default=150)),
                ("q30_rate_percent", models.FloatField(default=0.0)),
                ("mean_depth", models.FloatField(default=0.0)),
                ("variant_count", models.IntegerField(default=0)),
                (
                    "pipeline_status",
                    models.CharField(
                        choices=[
                            ("QUEUED", "Queued"),
                            ("RUNNING", "Running"),
                            ("SUCCEEDED", "Succeeded"),
                            ("FAILED", "Failed"),
                        ],
                        default="SUCCEEDED",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ngs_sequences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at", "id"),
            },
        ),
    ]
