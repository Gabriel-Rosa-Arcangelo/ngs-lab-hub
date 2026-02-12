from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exports", "0002_exportjob_progress_and_events"),
    ]

    operations = [
        migrations.AlterField(
            model_name="exportjob",
            name="file_format",
            field=models.CharField(
                choices=[("csv", "Csv"), ("xlsx", "Xlsx"), ("zip", "Zip")],
                default="csv",
                max_length=10,
            ),
        ),
    ]
