# AI test memoization — design & known issues

`src/testing/memoization/MemoizedLanguageModel.ts` records live LLM responses to a JSON snapshot
(`*.conversations.json`) and replays them so agent/skill tests are deterministic and offline. The
hard part is **reconciling run-specific values** (space keys, entity ids, timestamps) between the
saved snapshot and the live prompt so a structurally-identical conversation still matches.

## Mechanism

A memoized entry is `{ parameters, prompt, response }` stored with the **real** values. Matching a
live call:

1. **Normalize** both prompts (`normalizePromptForMemoization`):
   - any object key named `timestamp` → `<memoized-timestamp>` (turn metadata carries the live clock
     and is fed back into every later turn's prompt);
   - the `The current date and time is …` system line → `<memoized-datetime>`.
2. **Canonicalize opt-in dynamic tokens** (`dynamicValuePatterns`, e.g. `SPACE_ID_PATTERN`,
   `ENTITY_ID_PATTERN`): each distinct token is rewritten to a **positional** placeholder
   `<memoized-dynamic-N>`, where `N` is its order of first appearance.
3. **Compare** `parameters` (exact) and the canonicalized prompt (`jsonStableStringify` equality).
4. On a hit, **remap** the stored response's dynamic tokens back to the live prompt's real values
   (i-th stored distinct token → i-th live distinct token).

Ids are **not** blanket-redacted (see the module header): determinism is meant to come from a
fixed-seed test PRNG; canonicalization is only for genuinely run-specific values (space keys).

## The bug (why regenerated fixtures miss across environments)

The observed CI failure was a one-token drift in the canonical form:

```
- "doc": "echo://<memoized-dynamic-41>/<memoized-dynamic-42>"   (saved)
+ "doc": "echo://<memoized-dynamic-43>/<memoized-dynamic-42>"   (live)
```

Same object (`42`), but the space key slid `41 → 43`. Root cause:

1. **Index-assignment order ≠ comparison order.** `collectDynamicValues` numbered tokens by
   `deepMapValues`, which walks objects in **insertion order** (`for (const key in value)`). But
   prompts are compared with `jsonStableStringify` — **sorted** keys. So the placeholder _value_
   encoded a non-canonical ordinal: two prompts that are equal after key-sorting could still get
   different ordinals if their object key order differed (common between a JSON-loaded snapshot and
   a freshly-built live prompt), producing a false miss.
2. **Global positional numbering couples every token to all earlier ones.** `N` is the count of
   distinct dynamic values seen _before_ a token across the whole prompt, so any earlier delta
   (a reordered field/tool-call, an id that first appears alone vs paired) renumbers everything
   downstream — exactly the `41 → 43` signature.

## The fix

`collectDynamicValues` now collects over the **canonical, key-sorted** serialization
(`jsonStableStringify(prompt)`) instead of the insertion-order object walk. This makes the
first-appearance order that fixes each placeholder identical to the order used for comparison, so
two structurally-equal prompts canonicalize identically regardless of object key order. Snapshots
store raw values, so this is a compare-time-only change and needs **no fixture regeneration** — it
only turns previously-false misses into hits.

Verified by a new unit test (`canonicalization is stable under object key insertion order`) that
fails on the old insertion-order collection and passes on the sorted collection.

## Residual limitations / future work

- **Genuine content divergence still (correctly) misses.** If a live conversation really has a
  different count/structure of dynamic tokens than the snapshot (agent produced different tool
  calls, non-deterministic ids), it will not match — that is a stale fixture / upstream determinism
  problem, not something canonicalization should paper over. Fix the id determinism (fixed-seed
  PRNG per the module header) or regenerate.
- **`ENTITY_ID_PATTERN` opt-in vs the determinism invariant.** The header states entity ids are
  deterministic in tests and must not be redacted; suites that opt entity ids into
  `dynamicValuePatterns` reintroduce positional fragility. Prefer relying on the fixed seed and
  canonicalizing only truly run-specific tokens (space keys).
- **Broad matchers over-capture.** `ENTITY_ID_PATTERN` matches any 26-char Crockford window in any
  string; incidental matches inflate the token set. Keep patterns as specific as possible and list
  longer patterns first (`SPACE_ID_PATTERN` before `ENTITY_ID_PATTERN`).
- **Snapshot growth.** The store appends and never prunes unused conversations (see the TODO in the
  source); large files should eventually be scoped per-test with last-used pruning.
