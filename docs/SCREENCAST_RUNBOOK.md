# Screencast Runbook

## Pre-recording setup
```bash
make demo
cd frontend
npm install
npm run dev
```

Open:
- `http://localhost:5173/demo`
- `http://localhost:8000/api/docs/`
- `http://localhost:9001`

Credentials:
- `demo`
- `demo1234`

## Suggested recording script (2-3 min)
1. Show README architecture.
2. Open `/samples` and show create/edit/delete of NGS records.
3. Open `/demo` and click **Run Full Demo**.
4. Explain timeline panel while jobs run.
5. Go to `/dashboard` and show NGS KPI cards + trend charts.
6. Go to `/exports`, filter and open latest report.
7. In report detail, show events + generated content preview + download action.
8. Finish in Swagger (`/api/docs`) to show endpoint coverage.

## Optional cleanup
```bash
make down
```
