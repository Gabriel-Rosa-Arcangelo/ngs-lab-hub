from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exports", "0003_alter_exportjob_file_format"),
    ]

    operations = [
        migrations.AlterField(
            model_name="exportjob",
            name="kind",
            field=models.CharField(
                choices=[
                    ("RAW_TABLE", "Raw Table"),
                    ("TAT_SUMMARY", "Tat Summary"),
                    ("NGS_TRIMMING_REPORT", "Ngs Trimming Report"),
                    ("NGS_PIPELINE_REPORT", "Ngs Pipeline Report"),
                ],
                default="RAW_TABLE",
                max_length=30,
            ),
        ),
    ]
