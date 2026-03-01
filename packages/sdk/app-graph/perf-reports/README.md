# App Graph Perf Reports

This directory stores committed analysis notes for app-graph performance investigations.

### Committed contents

- `phase-*.md`: stable writeups of investigation phases and conclusions.

### Local-only captures

Raw capture payloads are intentionally not committed.

- Put local JSON/trace captures under `perf-reports/captures/`.
- Root-level files like `flush-records*.json` and `Trace-*.json` are ignored by `.gitignore`.

### Correlation tooling

Use the app-graph correlation script from the package root:

`pnpm run correlate-flush-trace -- --trace <trace.json> [--flush-records <flush.jsonl>]`
