# Composer forensics report — TEMPLATE

Copy to `/tmp/composer-forensics/reports/YYYY-MM-DD-<origin-slug>.md` at session start. Update continuously; do not commit (may contain user data).

---

## Session

| Field                   | Value                                            |
| ----------------------- | ------------------------------------------------ |
| **Date**                | YYYY-MM-DD                                       |
| **Origin**              | e.g. `https://main.composer.space`               |
| **Agent**               | (optional)                                       |
| **User report**         | (paste or summarize what the user said is wrong) |
| **Recovery debug port** | open / not open                                  |
| **HTTPS**               | yes → `COMPOSER_RECOVERY_HTTPS=1` required       |

---

## Symptoms (user)

What the user experiences (blank screen, slow space open, missing data, etc.):

- ***

## Exploration log

Chronological notes — commands run, observations, timings. Read-only unless user approved a change.

| Step | Command / action             | Result |
| ---- | ---------------------------- | ------ |
| 1    | `dxos.recovery.status()`     |        |
| 2    | `await dxos.recovery.boot()` |        |
| 3    |                              |        |

---

## Findings

### Profile summary

- Identity:
- Spaces:
- SQLite size (if exported):
- Largest Automerge docs (if analyzed):

### Root cause (if known)

-

### Evidence

- Document ids, sizes, ratios, op counts, object ids, etc.

---

## Diagnosis

Plain-language summary for the user: what broke, why, whether data is safe.

---

## Issues for DXOS team

File or extend Linear/GitHub issues here. Include repro, doc ids, code pointers.

```markdown
**Title:**
**Severity:**
**Component:** (e.g. TagIndex, recovery mode, echo-db)
**Repro:**
**Suggested fix:**
```

---

## Issues for external teams

(e.g. Automerge maintainers — attach `automerge-escalate.js` bundle)

```markdown
**Team:**
**Title:**
**Evidence paths:**
**Escalation bundle:**
```

---

## Remediation

> **Only fill this section after explicit user approval for data changes.**

| Field             | Value                                   |
| ----------------- | --------------------------------------- |
| **User approved** | yes / no / pending                      |
| **Action**        | e.g. `dxos.recovery.compactDocuments()` |
| **Result**        |                                         |
| **Verified**      | how you confirmed improvement           |

---

## Next steps (user)

1.
2.

### Issues to submit

- [ ] DXOS: …
- [ ] External: …

### Follow-up

- Monitor …
- Re-export SQLite if …
- Normal boot expected after …

---

## Artifacts

| Artifact          | Path                   |
| ----------------- | ---------------------- |
| Exported SQLite   | `/tmp/.../DXOS.sqlite` |
| Automerge inspect |                        |
| Escalation bundle |                        |
