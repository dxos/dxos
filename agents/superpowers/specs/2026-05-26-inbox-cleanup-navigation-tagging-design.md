# Inbox cleanup, n/p navigation, and tagging-driven fixtures

Date: 2026-05-26
Worktree: `claude/gallant-perlman-0d36b9`

## Summary

Three concerns in `plugin-inbox` addressed in sequence:

1. **Message processing pipeline** — strip residual HTML/XML tags after turndown, extend blank-line collapsing, and add a setting that gates remote-image rendering in `MessageArticle`.
2. **`n` / `p` key navigation** — add next/previous shortcuts to `MailboxArticle` and `CalendarArticle` via the existing `@dxos/keyboard` graph-action pipeline.
3. **Tagging + formatting-issue fixture corpus** — restore the missing tagging UI on messages, and build a fixture-driven regression test path for the Task 1 pipeline.

Execution order: 1 → 2 → 3, separate commits per sub-task.

## Task 1 — Message processing pipeline

### Files

- `packages/plugins/plugin-inbox/src/operations/google/util.ts`
- `packages/plugins/plugin-inbox/src/operations/google/util.test.ts`
- `packages/plugins/plugin-inbox/src/types/...` — extend `Settings` schema
- `packages/plugins/plugin-inbox/src/components/Message/Message.tsx`
- `packages/plugins/plugin-inbox/src/components/Message/Message.test.tsx` (new, optional)

### 1a — Strip residual HTML/XML tags

Add `stripResidualTags(text: string): string` invoked inside `normalizeText` _after_ turndown conversion, _before_ `stripWhitespace`.

Targets:

- MS Office namespaced tags: `<o:p>`, `<v:shape>`, `<w:…>`, `<m:…>`, etc. — pattern `</?[a-z]+:[^>]*>`.
- Conditional comments: `<!--[if …]>…<![endif]-->`.
- Stray inline tags turndown leaves behind on edge cases: `<span …>`, `<font …>`, `<u …>`, `<o:p></o:p>`, attribute-only `<div>` openers, etc.
- Self-closing `<br/>` and `<hr/>` that survive when wrapped in non-block contexts.

Strategy: targeted regex passes (conservative, preserve inner text). Order:

1. Conditional comments: `s/<!--\[if[^\]]*\][\s\S]*?<!\[endif\]-->//g`.
2. Namespaced tags: `s/<\/?[a-z]+:[^>]*>//gi`.
3. Stray known-bad tags: `s/<\/?(span|font|u|o|div)([^>]*)>//gi` — but only on text that already went through turndown (so we know paragraph structure is markdown, not HTML).
4. Generic catch-all for residual single-line tags: `s/<\/?[a-zA-Z][a-zA-Z0-9]*[^>\n]{0,200}>//g` — bounded length to avoid greedy run-aways.

Tests in `util.test.ts` under new `describe('residual tags')`:

- `<o:p>Hello</o:p>` → `Hello`
- `<v:shape …/>text` → `text`
- `<!--[if mso]><p>x</p><![endif]-->body` → `body`
- Real-world fragment from a Gmail Outlook-relayed message (use a redacted snippet).

### 1b — Blank-line collapsing

Existing `stripWhitespace()` already collapses 3+ newlines down to `\n\n`. Extend coverage for cases that escape today:

- After `stripResidualTags` removes tags, lines can become whitespace-only — current regex covers this via `[\s ]*` segment. Add explicit test.
- Turndown emits multiple paragraph breaks for `<br><br><br>`; verify converted markdown still collapses cleanly. Add test.
- Strip leading/trailing blank lines from the whole document (currently relies on `trim()`).

Tests:

- `'aaa\n<o:p></o:p>\n\n\nbbb'` after full pipeline → `'aaa\n\nbbb'`.
- `'<p>a</p><br><br><br><p>b</p>'` → `'a\n\nb'`.

### 1c — Image rendering setting

Add field to `InboxCapabilities.Settings` schema:

```ts
loadRemoteImages: Schema.Boolean.pipe(
  Schema.optional,
  /* default: */ Schema.withConstructorDefault(() => false),
);
```

Default: `false` (off — privacy-first).

In `Message.tsx`, read the setting via `useAtomCapability(InboxCapabilities.Settings)` (already imported in `MailboxArticle`), wire it into the editor extensions:

- Pass `skip: (node) => node.name === 'Image' && /^https?:\/\//.test(node.url) && !loadRemoteImages` through `decorateMarkdown` _and_ add equivalent skipping in the bundled `image()` extension.
- Extend `decorate.ts` so the bundled `image()` honors the same `skip` callback (currently it doesn't see the option). Smallest change: forward `options.skip` into `image(options)`.
- When skipped, the link still renders as a normal markdown link `[label](url)`.

Tests:

- Vitest test that constructs an editor with `decorateMarkdown({ skip: () => true })` and asserts no `<img>` is created (use `EditorView` with a `dom` parent).
- Snapshot of editor inner-HTML before/after.

### Acceptance for Task 1

- `moon run plugin-inbox:test` green.
- All new tests added in `util.test.ts` and (if introduced) `Message.test.tsx`.
- Setting visible in the inbox settings UI; toggling re-renders message content.

## Task 2 — `n`/`p` next/previous navigation

### Mechanism

`@dxos/keyboard` singleton, fed via the graph-action route (`plugin-navtree/src/capabilities/keyboard.ts`). Each `Node.Action` whose `properties.keyBinding` is set gets registered into `Keyboard.singleton.getContext(path).bind(...)`, scoped to the node's path. Active context is set when the user navigates / attention shifts.

### Files

- `packages/plugins/plugin-inbox/src/operations/...` — new operation definitions and handlers.
- `packages/plugins/plugin-inbox/src/types/InboxOperation.ts` (or wherever `InboxOperation` lives) — add `SelectNext`, `SelectPrevious`.
- `packages/plugins/plugin-inbox/src/capabilities/...` — graph action contributions for Mailbox and Calendar nodes.
- `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx` — set keyboard context on attention.
- `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx` — same.
- Tests near each module.

### Operation handlers

Generic helper that resolves the current article's items and picks the next/previous id:

```ts
const advance = ({ ids, currentId, delta }: { ids: string[]; currentId?: string; delta: 1 | -1 }) => {
  if (!ids.length) return undefined;
  const idx = currentId ? ids.indexOf(currentId) : -1;
  const next = Math.max(0, Math.min(ids.length - 1, idx + delta)); // clamp
  return ids[next];
};
```

Per-Article, on shortcut fire, the handler:

1. Reads sorted items (messages/events) — share the same selector logic the Article already uses.
2. Reads `currentId` via `useSelected(id, 'single')`.
3. Computes `nextId` (clamped).
4. Dispatches the same `showItem` / `LayoutOperation.Select` call used by the existing `current` handler.

Because graph actions run outside React, the Article exposes the sorted-id list onto a Capability or onto a `useRef` that the action reads. Cleaner: factor the article's "current selected items + currentId" into an atom that both React and the operation handler can read.

### Wiring

In each container, when the Article gains attention:

```ts
useEffect(() => {
  if (attended) {
    Keyboard.singleton.setCurrentContext(articlePath);
  }
}, [attended, articlePath]);
```

Graph action contribution registers actions on the Mailbox / Calendar node with `keyBinding: 'n'` and `keyBinding: 'p'`. They appear in the `ShortcutsHints` UI automatically.

### Wrap/clamp semantics

**Clamp** — `n` at last item stays; `p` at first item stays.

### Tests

- Unit test for `advance(...)` helper covering empty list, single item, first-last clamp, mid-list.
- Story update for both Articles documenting the shortcut in the toolbar caption.

## Task 3 — Tagging + fixture corpus

### 3a — Restore message tagging UI

Symptom (reported): tag UI is missing/non-functional on individual messages. Repro pass first:

- Read `packages/plugins/plugin-inbox/src/components/Message/Message.tsx` and the surrounding `MessageStack`.
- Compare to `MailboxArticle.handleAction` → `select-tag` flow, which assumes some affordance to add a tag.
- Identify gap and propose a focused, minimal fix (return for one-line approval before changing code).

Likely fix surface: a tag menu/popover in the `Message` toolbar that lets the user assign one of the existing `Tag.Tag` objects (or create a new one) and creates a `HasSubject` relation from the tag to the message via the existing helper used elsewhere in the plugin.

### 3b — Fixture corpus and regression tests

Add a well-known tag `dxos.org/tag/formatting-issue` seeded by `plugin-inbox` on init (or on first sync).

New operation `InboxOperation.ExportTaggedMessagesFixture`:

- Inputs: `{ tagId: string; subdir?: string }`.
- The output path is derived internally and constrained to a canonical base directory: `packages/plugins/plugin-inbox/src/testing/fixtures/formatting-issues/`. `subdir`, if provided, is normalized and validated to be a strict subpath of that base (rejects `..`, absolute paths, or escapes). No arbitrary `outputDir` is accepted from callers.
- **Mandatory redaction-by-default before file write.** The exporter MUST run a deterministic redaction pass over the Gmail payload before serializing:
  - Replace all email addresses (in `From`, `To`, `Cc`, `Bcc`, `Reply-To`, `Message-ID`, `References`, `Return-Path`, and any address found in the body) with stable placeholders (e.g., `redacted+<sha256-prefix>@example.invalid`).
  - Strip auth tokens, cookies, and any `Authorization` / `X-*` auth-bearing headers.
  - Drop `Received:` headers (contain internal SMTP hostnames).
  - Replace personal names found in `From` / display-name fields with `Redacted Person <N>` (stable per-address hash).
  - Redact phone numbers and URLs that include query params (querystrings can contain tokens) — keep the host + path only.
- The redaction pass is followed by a schema-validation step: a `RedactedMessagePayload` schema enumerates the allowlisted fields; serialization fails (and the file is NOT written) if any non-allowlisted field is present.
- The produced fixture additionally carries the post-pipeline rendered markdown (the regression test target).

New test file `packages/plugins/plugin-inbox/src/operations/google/gmail/mapper.fixtures.test.ts`:

- Reads every JSON in the fixtures dir at startup.
- Runs each through the production `mapMessage` / `normalizeText`.
- Snapshots the produced markdown — fails on diff.

Workflow:

1. User tags a noisy message in the UI with `formatting-issue`.
2. User invokes the export op (e.g., from a command-palette entry, or a CLI script).
3. Generated fixture committed to the repo.
4. CI test runs the pipeline against every fixture; output diff = regression.

### Tests for 3a

- Existing `MailboxArticle.handleAction` test (`select-tag` case) — verify the new affordance produces the expected `HasSubject` relation.
- New component test for the tag picker in `Message`.

## Out of scope (explicit)

- Outlook/Teams boilerplate stripping (Q1 option not selected).
- Signature/legal-disclaimer stripping.
- Tracker-pixel detection during preprocessing (image rendering controlled by setting at render time instead).
- Trace-panel `Fade` bleed bug (Task 4 was withdrawn).

## Risks

- The bundled `image()` extension in `ui-editor` is shared with many editors. Forwarding `skip` to it is a public API change; need to keep default behavior unchanged for non-inbox callers.
- Graph-action wiring needs the keyboard context to update correctly when attention shifts between two articles; risk of stale context. Mitigation: explicit `setCurrentContext` on mount/attention and clean reset on unmount.
- Fixture corpus could capture PII. **Mitigation: mandatory redaction-by-default in the export operation** (see Task 3b above) — addresses, names, auth headers, tokens, and tracking querystrings are scrubbed deterministically before write, and schema validation refuses to serialize any non-allowlisted field. The output path is constrained to the canonical fixtures directory; no caller-supplied absolute or escaping paths are accepted.
