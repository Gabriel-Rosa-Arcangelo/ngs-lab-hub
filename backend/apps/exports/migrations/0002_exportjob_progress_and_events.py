from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("exports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="exportjob",
            name="progress_current",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="exportjob",
            name="progress_total",
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name="ExportEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("level", models.CharField(choices=[("INFO", "Info"), ("WARNING", "Warning"), ("ERROR", "Error")], default="INFO", max_length=10)),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("job", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="exports.exportjob")),
            ],
            options={
                "ordering": ("created_at", "id"),
            },
        ),
    ]
