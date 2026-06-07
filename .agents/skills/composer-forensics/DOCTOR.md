# Composer doctor — live recovery workflow

Use this when the user has a **live Composer profile** and can open **`/recovery.html`**. Pair with offline forensics ([SKILL.md](SKILL.md)) when you need on-disk extraction.

**Command reference:** [COMMANDS.md](COMMANDS.md) · **Report template:** [reports/REPORT-TEMPLATE.md](reports/REPORT-TEMPLATE.md)

---

## Roles

| Who | Does |
|-----|------|
| **User** | Opens Composer in **their** browser, navigates to `/recovery.html`, clicks **Open Debug Port**, describes symptoms |
| **Agent** | Runs `composer-recovery.js` from the repo — explores, writes report, diagnoses, **asks before any data change** |

**IMPORTANT:** The agent **does not** start the browser, open Cursor’s browser, or drive the user’s Chrome profile. The user’s external Composer session owns their data and debug port.

---

## Process

```
User opens debug port → User describes problem → Agent explores (read-only)
    → Report updated → Diagnosis → [optional: user approves fix] → Remediate → Close-out
```

### 1. Handoff — user opens debug port

Ask the user to:

1. Open their Composer origin (e.g. `https://main.composer.space/recovery.html` or local dev).
2. Click **Open Debug Port** (leave the tab open; it long-polls `127.0.0.1:9321`).
3. Tell you **what’s wrong** in their own words.

On **HTTPS** origins, remind them you will use `COMPOSER_RECOVERY_HTTPS=1` (mkcert-trusted cert). See [COMMANDS.md §12](COMMANDS.md).

Agent verifies connectivity (read-only):

```bash
node .agents/skills/composer-forensics/scripts/composer-recovery.js 'return dxos.recovery.status()'
```

Composer echoes each snippet in the recovery log before eval.

### 2. Intake — user describes the problem

Capture in the report **Symptoms** section:

- What they see (freeze, blank UI, one space slow, missing objects, etc.).
- When it started, which space/plugin, whether normal boot works.
- Whether they can use recovery mode but not main app.

Do not assume — ask one focused batch of clarifying questions if needed.

### 3. Explore — agent investigates (read-only default)

Create or open the session report:

```text
/tmp/composer-forensics/reports/YYYY-MM-DD-<origin-slug>.md
```

Copy from [reports/REPORT-TEMPLATE.md](reports/REPORT-TEMPLATE.md). Update **Exploration log** as you go.

**Read-only exploration order** (typical):

```bash
# Status + boot minimal client
node composer-recovery.js 'return dxos.recovery.status()'
node composer-recovery.js 'await dxos.recovery.boot(); return { identity: dxos.client.halo.identity.get()?.identityKey.truncate() }'

# Spaces
node composer-recovery.js 'await dxos.recovery.boot(); const s = dxos.client.spaces.get(); return s.map(x => ({ id: x.id, state: x.state.get() }))'

# Open space + list objects (adjust space index / id)
node composer-recovery.js 'await dxos.recovery.boot(); const space = dxos.client.spaces.get()[0]; await space.open(); return (await space.db.query(dxos.Filter.everything()).run()).map(o => ({ id: o.id, type: dxos.Obj.getTypename(o) }))'
```

If boot is too slow or fails, **Export SQLite** (user button or debug command) → offline pipeline:

```bash
# Export via debug port — write full JSON to file first (avoid terminal truncation)
node composer-recovery.js 'await dxos.recovery.boot(); return await dxos.client.services.host.exportSqliteDatabase()' > /tmp/recovery-export.json
# decode base64 → /tmp/composer-recovery-live.sqlite, then automerge-list.js / automerge-inspect.js
```

Use [COMMANDS.md](COMMANDS.md) for automerge size/mutation analysis and [LINEAR-tagindex-write-amplification.md](LINEAR-tagindex-write-amplification.md) as a reference pattern for history bloat.

### 4. Diagnose — write it down

When you understand the issue, fill in the report:

- **Findings** — evidence (doc ids, binary/JSON ratio, object counts, errors).
- **Diagnosis** — plain-language summary for the user.
- **Issues for DXOS team** — separate block: title, severity, component, repro, suggested fix, code pointers.
- **Issues for external teams** — separate block (e.g. Automerge): escalation bundle path, stats, hypothesis.

Promote durable patterns to a `LINEAR-*.md` draft in this skill folder if filing a DXOS issue.

### 5. Confirm before changing data

**ALWAYS confirm with the user before any operation that mutates their profile.**

Read-only (no confirmation needed):

- `status()`, `boot()` for inspection, queries, export SQLite to agent machine, offline analysis.

Requires **explicit user approval**:

- `compactDocuments()`, any `Obj.update`, reset, import, epoch migration, deleting objects, profile import/export back into live storage, or anything that writes Automerge/ECHO/SQLite on their origin.

Present: what you will run, expected outcome, risks (sync, epoch, irreversibility without backup).

Suggest **Export SQLite** first if they have not already.

### 6. Remediate — only with permission

After approval, run the fix via debug port and log it in **Remediation**:

```bash
# Example: document compaction epoch migration (TagIndex bloat, slow doc load)
node composer-recovery.js 'await dxos.recovery.boot(); return await dxos.recovery.compactDocuments()'

# Target specific object docs only
node composer-recovery.js 'await dxos.recovery.boot(); return await dxos.recovery.compactDocuments({ objectIds: ["01KTHX1R..."] })'
```

Verify improvement (load time, space open, object still present) and record in the report.

### 7. Close-out — report + user guidance

Update the report:

- **Remediation** — action, result, verification (if performed).
- **Next steps (user)** — e.g. try normal boot, watch for regression, keep export backup.
- **Issues to submit** — checklist for DXOS vs external tickets with links/titles ready to paste.

Tell the user:

- Short diagnosis recap.
- What was done (if anything) and what was **not** done.
- Which issues they (or DXOS) should file and where.
- Whether to retry main app or stay on recovery for another pass.

Append a one-line pointer in [MEMORY.md](MEMORY.md) (no secrets; report path only).

---

## Agent checklist

```
Doctor session:
- [ ] User opened /recovery.html → Open Debug Port (agent did NOT open browser)
- [ ] User symptoms captured in report
- [ ] Report file created under /tmp/composer-forensics/reports/
- [ ] Read-only exploration complete (status → boot → spaces → objects / export + offline)
- [ ] Diagnosis written (Findings + Diagnosis sections)
- [ ] DXOS issues block filled (if applicable)
- [ ] External issues block filled (if applicable)
- [ ] User explicitly approved before ANY data mutation
- [ ] Remediation logged (if performed) + verified
- [ ] Next steps and issue submission list given to user
- [ ] MEMORY.md updated (session pointer only)
```

---

## Common fixes (after user approval)

| Problem | Typical fix | Notes |
|---------|-------------|--------|
| Automerge history bloat (high binary/JSON ratio) | `dxos.recovery.compactDocuments()` | New epoch; old chunks may linger until GC — export before/after |
| App won’t boot, unknown state | Export SQLite → offline forensics; avoid Reset until diagnosed | Reset is destructive |
| Need code fix only | Diagnose + file DXOS issue; compaction does not replace app fix | TagIndex still needs `push`/`splice` fix |

---

## Privacy

- Reports and exports live under `/tmp` — **never commit** to git.
- Do not paste keys, email content, or passwords into skill docs or PRs.
