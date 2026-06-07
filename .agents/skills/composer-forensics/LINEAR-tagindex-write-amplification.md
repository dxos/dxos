# Composer load regression: Automerge write amplification in TagIndex

**Status:** Investigated (forensics) · Fix not yet shipped  
**Severity:** High — space open / sync blocked on affected profiles  
**Evidence date:** 2026-06-07 · `main.composer.space` extract

---

## Summary

Composer became unusably slow for users with active Inbox / Feed tagging because a single Automerge document grew to **14 MiB** and takes **~15s** to load, while the materialized data is only **~90 KiB**. The document holds one Mailbox object; bloat is entirely **historical mutation overhead**, not current payload size.

Root cause: `TagIndex.setTag` / `unsetTag` in `@dxos/app-toolkit` **replace entire arrays** on every tag toggle. Automerge records each replacement as a full `set` over the array value, producing **~10k ops per change** and **quadratic** growth as tag lists grow.

---

## User impact (symptoms)

- Long blank / frozen UI when opening a space (especially Inbox-heavy profiles).
- Worker blocked on `loadIncremental` for space DB documents.
- SQLite `automerge_chunks` rows grow without bound; sync and persistence amplify the problem.
- **Data is not lost** — `toJS` + `JSON.stringify` completes in ~8ms; only **replay of history** is expensive.

---

## Forensics evidence

Document: `2DWmBh837zCBGPFZheCWBH1KFMRL` (largest classic Automerge doc on affected profile).

| Metric | Value |
|--------|-------|
| Combined binary (merged chunks) | 14.20 MiB |
| Reified JSON (`toJS` + `JSON.stringify`) | 90 KiB |
| Binary / JSON ratio | **161×** |
| `loadIncremental` | **~15s** |
| `toJS` | ~8ms |
| Automerge changes | 3,149 |
| Automerge ops | **32,664,386** |
| Ops / change (median) | **10,342** |
| Ops / change (max) | 21,952 |
| Actors | 2 |

### Op action breakdown (all changes decoded)

| Action | Count | Share |
|--------|------:|------:|
| `set` | 31,451,560 | **96.3%** |
| `makeText` | 1,209,669 | 3.7% |
| `makeList` | 3,146 | ~0% |
| `makeMap` | 11 | ~0% |

### Reified state (what the user actually has)

- **1 object** in the space document: Mailbox `maretskii@gmail.com`
- `tags` TagIndex: **8 tag keys**, **3,143 message ids** total
- Largest tag array: **813 ids**

So: **3,149 edits → 32M ops → 90 KiB of live data**.

### Chunk growth

| Chunk | Size | Δ ops | Δ changes | Load |
|-------|------|------:|----------:|-----:|
| snapshot | 6.09 MiB | 28,723,677 | 2,955 | ~11s |
| incremental | 1.66 MiB | 0 | 0 | ~117ms |
| incremental | 5.22 MiB | 0 | 0 | ~373ms |
| incremental | 1.23 MiB | 3,940,709 | 194 | ~3.3s |

Most history is already baked into the snapshot; incremental loads add more without reducing replay cost.

Reproduce locally:

```bash
cd .agents/skills/composer-forensics/scripts
node automerge-inspect.js /path/to/DXOS.sqlite 2DWmBh837zCBGPFZheCWBH1KFMRL --mutations
node automerge-escalate.js /path/to/DXOS.sqlite 2DWmBh837zCBGPFZheCWBH1KFMRL --out-dir /tmp/am-escalation
```

Escalation bundle for Automerge maintainers: `.bin` + `-report.md` (see `automerge-escalate.js`).

---

## Root cause

### TagIndex mutation pattern

`TagIndex` maintains an inverse index `Record<tagId, objectId[]>` on mutable host objects (Mailbox, Subscription, Commerce Search, etc.). Each tag toggle goes through `Obj.update`.

**Current implementation** (`packages/sdk/app-toolkit/src/TagIndex.ts`):

```typescript
// setTag — REPLACES the entire array on append
record[tagId] = [...record[tagId], objectId];

// unsetTag — REPLACES the entire array on remove
record[tagId] = next; // next = record[tagId].filter(...)
```

The file’s own comment says to **mutate in place** and not reassign detached trees — but `setTag` / `unsetTag` violate that guidance by assigning new array values every time.

### Why Automerge amplifies this

Automerge CRDTs retain **full edit history**. Replacing an array value with a new JS array (even with one extra element) is modeled as a wholesale `set`, not a single list insert. Each replacement re-materializes the list contents in the op log.

With ~3k tag operations on arrays that grow to hundreds of elements:

- Each `setTag` can emit **O(n) ops** for an array of length *n*.
- Summed over the lifetime: **O(n²) total ops** (classic CRDT footgun).
- Observed: **~10k ops/change** median; recent changes **~20k ops/change**.

This is an application-level anti-pattern, not an Automerge bug — but it produces documents worth sharing with maintainers as a real-world stress case.

### Where TagIndex is used (blast radius)

Any host object with `tags: TagIndex.field()` accumulates this history:

| Area | Host type | Typical churn |
|------|-----------|---------------|
| Inbox | `Mailbox` | Per-message tag apply/remove |
| Feed | `Subscription` | Star / archive on posts |
| Commerce | `Search` | Starred results |

Inbox Mailboxes with heavy tagging are the worst case (thousands of message ids in tag arrays).

---

## Why Composer “broke”

1. Space DB documents are loaded eagerly during space open / object hydration.
2. One bloated document dominates worker CPU and main-thread wait (RPC + deserialization).
3. Every subsequent tag toggle **adds another ~10k-op change**, making recovery slower over time.
4. Storage and sync replicate the full binary — mobile / slow disks suffer twice.

The app logic is fine at the **materialized** layer; **history replay** is the failure mode.

---

## Fix plan

### 1. Stop the bleeding — correct TagIndex mutations (required)

Use **in-place list mutation** inside `Obj.update` so Automerge emits append/delete ops instead of whole-array `set`.

**`setTag`** — append with `push`:

```typescript
if (!has(record, tagId)) {
  record[tagId] = [objectId];
} else if (!record[tagId].includes(objectId)) {
  record[tagId].push(objectId); // in-place; do not spread-replace
}
```

**`unsetTag`** — remove with `splice`:

```typescript
if (!has(record, tagId)) {
  return;
}
const index = record[tagId].indexOf(objectId);
if (index === -1) {
  return;
}
record[tagId].splice(index, 1);
if (record[tagId].length === 0) {
  delete record[tagId];
}
```

**Files:** `packages/sdk/app-toolkit/src/TagIndex.ts`  
**Tests:** extend `TagIndex.test.ts`; add regression that counts Automerge ops per `setTag` (expect **O(1) ops per append**, not O(n)).

**Audit:** grep for similar patterns — any `Obj.update` that assigns `[...arr, x]` or `arr.filter(...)` to schema-backed arrays.

### 2. Verify ECHO array proxy behavior

`TagIndex` already relies on in-place mutation for the `tags` record map. Confirm reactive array `push` / `splice` map to Automerge list ops (see `ObjectCore.arrayPush` for precedent). If proxy gaps exist, route through a small ECHO helper instead of spread-replace.

### 3. Remediate existing bloated documents (required for affected users)

Code fix alone does **not** shrink existing history. Affected documents need **compaction** — new Automerge doc containing only current materialized state.

**Option A — targeted document compaction (preferred for hot docs)**

For each document over a threshold (e.g. binary > 1 MiB or ops/change > 1000):

1. Load document; `toJS` materialized state.
2. Create fresh doc (`Automerge.init()` + single `change` writing current `objects` / `access` / `version`).
3. `repo.import(Automerge.save(freshDoc))`; update space root `links` to point at new document id.
4. Delete old chunks from storage after epoch / migration commit.

**Option B — space epoch migration**

Use existing epoch / `MigrationBuilder` flow when many objects or whole-space cleanup is needed. Avoid `migrateDocument` alone if the goal is to **drop** history — it preserves history by design.

**Option C — lazy compaction on load**

If load exceeds threshold, compact in worker before returning handle (user-visible one-time pause, then fast forever). Good safety net; still ship explicit migration for known bad profiles.

**Detection query** (offline forensics or worker metric):

```bash
node automerge-list.js /path/to/DXOS.sqlite   # sort by combined bytes
node automerge-inspect.js ... --mutations     # flag high binary/JSON ratio
```

### 4. Guardrails

- **Metrics:** emit `automerge.doc.load_ms`, `automerge.doc.ops`, `automerge.doc.bin_bytes`, `automerge.doc.json_bytes` per document load in worker.
- **Alert** when binary/JSON ratio > 10× or load > 2s.
- **Lint / review rule:** no array spread-replace inside `Obj.update` for persisted arrays.

### 5. Optional — Automerge maintainer escalation

If we want upstream input on compression / load performance for `set`-heavy docs:

```bash
node automerge-escalate.js /path/to/DXOS.sqlite <document-id> --out-dir /tmp/am-escalation
```

Attach `*.bin` + `*-report.md` to an Automerge issue. Redact user paths / PII before public posting.

---

## Acceptance criteria

- [ ] `TagIndex.setTag` / `unsetTag` use in-place `push` / `splice`; tests pass.
- [ ] New test: 1000× `setTag` on same tag produces **≪** 1000× median ops/change of old implementation (target: constant-ish ops per append).
- [ ] Compaction migration (or lazy compact) restores load time **< 500ms** on forensics fixture doc `2DWmBh837zCBGPFZheCWBH1KFMRL`.
- [ ] Forensics doc `2DWmBh…` after fix + compact: binary ≈ JSON order of magnitude (no 100× ratio).
- [ ] Inbox / Feed tagging UX unchanged at materialized level (same tag queries, same counts).

---

## Work breakdown (suggested Linear sub-issues)

1. **Fix TagIndex mutation pattern** — `@dxos/app-toolkit`, tests, op-count regression.
2. **Document compaction utility** — worker or migration script; wire into dev reset / one-off repair.
3. **Detect & compact on space open** — threshold-based lazy compact + telemetry.
4. **Audit other array-replace patterns** — Feed, Inbox, Commerce, migrations.

---

## References

- Forensics skill: `.agents/skills/composer-forensics/SKILL.md`
- TagIndex: `packages/sdk/app-toolkit/src/TagIndex.ts`
- Mailbox schema: `packages/plugins/plugin-inbox/src/types/Mailbox.ts`
- TagIndex design comment (in-place mutation): same file, `write()` helper
- Epoch / migration: `packages/sdk/migrations/src/migration-builder.ts`, `docs/src/content/blog/2024-07-03-decentralized-schema-changes-and-data-migrations.md`
