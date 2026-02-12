from __future__ import annotations

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from apps.datasets.models import LabUnit, ExamType, LabResult

fake = Faker()

class Command(BaseCommand):
    help = "Seed database with fake LabUnits, ExamTypes, and LabResults."

    def add_arguments(self, parser):
        parser.add_argument("--units", type=int, default=10)
        parser.add_argument("--exams", type=int, default=30)
        parser.add_argument("--results", type=int, default=50000)
        parser.add_argument("--days", type=int, default=90)

    def handle(self, *args, **opts):
        units_n = opts["units"]
        exams_n = opts["exams"]
        results_n = opts["results"]
        days = opts["days"]

        self.stdout.write(self.style.WARNING("Seeding..."))

        units = []
        for i in range(units_n):
            code = f"U{str(i+1).zfill(3)}"
            unit, _ = LabUnit.objects.get_or_create(code=code, defaults={"name": f"{fake.city()} Lab"})
            units.append(unit)

        exams = []
        for i in range(exams_n):
            code = f"EX{str(i+1).zfill(4)}"
            exam, _ = ExamType.objects.get_or_create(code=code, defaults={"name": f"{fake.word().title()} Panel"})
            exams.append(exam)

        now = timezone.now()

        batch = []
        batch_size = 5000
        for i in range(results_n):
            unit = random.choice(units)
            exam = random.choice(exams)

            collected_at = now - timedelta(days=random.randint(0, days), hours=random.randint(0, 23), minutes=random.randint(0, 59))
            # tat seconds with outliers
            tat = int(max(60, random.gauss(4 * 3600, 2 * 3600)))  # avg ~4h
            if random.random() < 0.02:
                tat *= random.randint(6, 20)  # outliers

            released_at = collected_at + timedelta(seconds=tat)

            status = "OK"
            if tat > 24 * 3600:
                status = "DELAYED"
            if random.random() < 0.01:
                status = "ERROR"

            batch.append(LabResult(
                unit=unit,
                exam_type=exam,
                collected_at=collected_at,
                released_at=released_at,
                tat_seconds=tat,
                status=status,
                patient_age=random.randint(0, 100),
                patient_sex=random.choice(["M", "F", "U"]),
            ))

            if len(batch) >= batch_size:
                LabResult.objects.bulk_create(batch, batch_size=batch_size)
                batch.clear()
                self.stdout.write(f"Inserted {i+1} / {results_n}")

        if batch:
            LabResult.objects.bulk_create(batch, batch_size=batch_size)

        self.stdout.write(self.style.SUCCESS("Done."))
