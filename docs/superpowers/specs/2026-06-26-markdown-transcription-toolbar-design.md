# Live transcription into Markdown via a toolbar control

Date: 2026-06-26
Status: Approved (design)

## Problem

`plugin-markdown` lets other plugins contribute toolbar buttons and CodeMirror
extensions (e.g. `plugin-comments`). We want `plugin-transcription` to contribute a
start/stop button to the Markdown editor toolbar that captures audio and streams the
live transcription into the document. The transcription text should appear as an
interim (greyed) preview that the user can confirm (insert into the document) or
cancel (discard).

The mechanism should be reusable: a generic CodeMirror extension that accepts
externally-supplied text via `StateEffect`s, and a generic start/stop control, so the
same capability can later be wired into any CodeMirror-based component.

## Non-goals (this iteration)

- Speaker / timestamp formatting of inserted text (raw text only).
- Auto-detecting objects and inserting `dx-anchor` links (future).
- Wiring the extension into non-Markdown components (the extension is built generic to
  allow it, but only Markdown is wired now).

## Architecture

Three decoupled units meeting at two seams.

```
Toolbar action (AppGraph)  ──writes──▶  recording-session atom  ──read──▶  recording driver (React)
                                                                                 │
                                                          useAudioTrack + useTranscriber (existing)
                                                                                 │ onSegments
                                                                                 ▼
                              EditorViewRegistry.get(id).view.dispatch( StateEffect )
                                                                                 ▼
                                       pendingText CodeMirror extension (interim preview + commit)
```

- **Seam A — recording-session atom**: a new capability holding the single active
  session `{ id; recording } | null`. The toolbar action writes it; the driver reads it.
- **Seam B — `EditorViewRegistry` + `StateEffect`s**: the driver resolves the live
  `EditorView` (existing `MarkdownCapabilities.EditorViews`, same pattern as
  `scroll-to-anchor.ts`) and dispatches the extension's effects into it.

### Unit 1 — `pendingText` CodeMirror extension (`@dxos/ui-editor`, generic)

New file `packages/ui/ui-editor/src/extensions/pending-text.ts`, exported from the
extensions barrel.

- **State**: a `StateField<PendingTextState | null>` holding
  `{ anchor: number; final: string; interim: string }`. `anchor` is mapped through
  document changes on every transaction (`tr.changes.mapPos`) so it survives concurrent
  edits and prior insertions.
- **StateEffects** (the external contract):
  - `setPendingAnchor(pos)` — begin a session at `pos` (defaults to selection head if
    no session active when the first text effect arrives).
  - `appendPendingFinal(text)` — append finalized text to `final`; clear `interim`.
  - `setPendingInterim(text)` — replace the volatile in-flight tail.
  - `commitPendingText` — insert `final` into the document at `anchor` as a real change;
    clear state.
  - `cancelPendingText` — discard all pending state; no document change.
- **Decorations**: a single block/inline widget at `anchor` rendering `final` then
  `interim` (interim dimmer), plus an inline confirm/cancel affordance built from
  `IconButton` (`ph--check--regular` / `ph--x--regular`). The widget dispatches
  `commitPendingText` / `cancelPendingText`.
- **Keymap** (only active while a session exists): `Enter` → commit, `Escape` → cancel.
- The extension knows nothing about audio, transcription, or atoms — only text in,
  commit/cancel out. Reusable by any CodeMirror component.

### Unit 2 — recording driver (`plugin-transcription`, React)

New headless hook/component `useTranscriptionInput` (or `TranscriptionInputDriver`)
that the Markdown extension capability mounts alongside the editor.

- Reads the recording-session atom. When `recording` is true for `id`:
  `useAudioTrack(true)` → `useTranscriber({ onSegments })` reusing the existing
  `TranscriptionCapabilities.TranscriberProvider` (including its `transcribe` fn).
- First emission dispatches `setPendingAnchor(selectionHead)`; each `onSegments` batch
  dispatches `appendPendingFinal(rawText)` (segment block text, space-joined). If the
  transcriber later exposes in-flight partials, those map to `setPendingInterim`.
- View resolution via `EditorViewRegistry.get(id)` → `entry.view.dispatch({ effects })`.
- When `recording` flips to false, the audio track + transcriber tear down (existing
  hooks already handle this) and the pending block remains for the user to
  confirm/cancel.

### Unit 3 — toolbar start/stop control (`plugin-transcription`, AppGraphBuilder)

New `app-graph-builder.ts` capability (mirroring `plugin-comments`):

- `GraphBuilder.createExtension` with `id: 'transcriptionToolbar'`, matching
  `Markdown.Document` nodes.
- A `disposition: 'toolbar'` action whose `data` handler toggles the recording-session
  atom for the document's id (the same id the editor registers under as
  `attendableId`).
- Label/icon reflect recording state: idle `ph--microphone--regular` →
  active `ph--microphone-slash--regular` (or a recording indicator). `testId:
  'transcription.record.toggle'`.
- Activated on `MarkdownEvents.SetupExtensions`, contributed to
  `AppCapabilities.AppGraphBuilder`, same plugin wiring as `plugin-comments`.

### Markdown extension capability (`plugin-transcription`)

New `markdown-extension.ts` capability contributing to
`MarkdownCapabilities.ExtensionProvider`: returns a provider that yields the
`pendingText()` extension (so every Markdown editor can receive injected text) and
mounts the driver. Activated on `MarkdownEvents.SetupExtensions`.

### Plugin wiring

- `TranscriptionPlugin.tsx`: register the new app-graph + markdown-extension modules
  (both `activatesOn: MarkdownEvents.SetupExtensions`) and the recording-session atom
  capability.
- Add `@dxos/plugin-markdown` as a `workspace:*` dependency of
  `@dxos/plugin-transcription` (required for `MarkdownCapabilities`,
  `MarkdownEvents`, and matching `Markdown.Document`). Direction is acyclic
  (plugin-markdown does not depend on plugin-transcription).

## Storybook

`packages/plugins/plugin-transcription/src/stories/MarkdownTranscription.stories.tsx`.

- Reuses `createStoryDecorators` but adds `MarkdownPlugin` to the plugin-manager
  decorator so the real `plugin-markdown` editor surface renders.
- Creates a `Markdown.Document` in the personal space and renders it via `Surface`
  (article role), so the editor shows its toolbar including the new transcription
  button.
- Driving audio uses the mic (consistent with the existing `LiveTranscription` story,
  which also requires a mic). The story demonstrates: click record → greyed text streams
  at the cursor → click stop → confirm/cancel the pending block.

## Testing

- **Unit 1 (`pending-text.test.ts`)** — headless, the primary safety net. Construct an
  `EditorState`/`EditorView` with `pendingText()`; dispatch synthetic effects and
  assert:
  - `appendPendingFinal` / `setPendingInterim` produce the expected decoration content.
  - `commitPendingText` inserts `final` into the document at `anchor` and clears state.
  - `cancelPendingText` leaves the document unchanged and clears state.
  - `anchor` survives an intervening user edit before the anchor (text lands at the
    right place).
- **Unit 3 (toolbar)** — assert the action toggles the recording-session atom.
- **Driver** — out of scope for automated tests this iteration (browser audio); covered
  manually via the storybook. The effect-translation logic is thin and exercised through
  Unit 1's effect contract.

## Decisions

1. Generic extension lives in `@dxos/ui-editor` (`src/extensions/pending-text.ts`),
   named generically (no transcription coupling).
2. Confirm/cancel commits the **whole** pending block; finalized segments accumulate in
   the greyed buffer rather than auto-committing per segment.
3. Raw text only; segments joined with spaces.
4. Single active recording session (one audio device), keyed by the editor id.
