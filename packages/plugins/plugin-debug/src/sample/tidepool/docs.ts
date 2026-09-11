//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Outline } from '@dxos/types';

//
// The documents a software project accumulates: a spec, an architecture note, a decision log and
// the scratch checklist.
//

/**
 * A `.mdl` spec — the plugin-spec grammar this repo uses for its own plugins: prose under `##`
 * headings, `rule` blocks the agentic review enforces, and `flow` blocks a QA run executes.
 */
const SPEC_MDL = `# Sync v2

## Design

A note is a CRDT sequence plus a plain-text title. The envelope carries a version byte so a client
that speaks v1 is refused with a typed error instead of failing to parse.

Reconciliation is one-way: the device offers its operations, the server replies with what it does
not hold. Nothing is deleted on either side as part of a sync.

## Rules

\`\`\`rule no-lww-on-bodies
A note body is never merged by timestamp. Any code path that picks a winner by \`updatedAt\` on
\`note.body\` is a defect — bodies converge through the sequence CRDT.
\`\`\`

\`\`\`rule versioned-envelope
Every payload written to the wire carries the envelope version. A writer that omits it is a defect;
an unversioned payload on read is rejected, not guessed at.
\`\`\`

## QA

\`\`\`flow QA-1 two devices, one paragraph
1. Take device A and device B offline.
2. On A, append a sentence to the second paragraph of "Tide pool survey — bay 3".
3. On B, correct a word in the same paragraph.
4. Bring both online.
5. Both edits are present and the paragraph reads correctly. Neither edit is lost.
\`\`\`

\`\`\`flow QA-2 v1 note on first open
1. Install the v1 client, write a note, uninstall.
2. Install this build and open that note.
3. The note opens, renders, and is converted in place exactly once.
4. Re-open it. No second conversion is recorded.
\`\`\`
`;

const ARCHITECTURE_MD = `# Architecture

Three moving parts. The device owns the truth; the relay only holds what it has been handed.

\`\`\`mermaid
flowchart LR
  subgraph Device
    UI[Editor] --> Store[(Local store)]
    Store --> Queue[Outbox]
  end
  Queue -->|offer ops| Relay
  Relay -->|missing ops| Store
  Relay --> Blobs[(Attachment store)]
  Queue -->|content hash| Blobs
\`\`\`

## Why the outbox is separate from the store

A field device is offline for weeks, so the store has to be readable and writable with no network at
all. Sync is therefore a consumer of the store rather than a layer under it — which is what lets the
editor be indifferent to connectivity.

## Attachments

Photos are content-addressed on capture. The device asks the relay which hashes it already holds and
uploads only the remainder, so a reconnect after two weeks in the field does not re-send the trip.
`;

const DECISIONS_MD = `# Decisions

## 2026-05-11 — Titles are last-writer-wins, bodies are not

A title is one line, usually typed once. Running it through the sequence CRDT costs the same
machinery as a body and buys a merge nobody asked for: two people renaming a note want to see one
name win, not a splice of both.

Bodies are different — paragraphs are edited concurrently and losing an edit is the bug we set out
to fix. So: body through the CRDT, title by timestamp, and the rule against timestamp-merging
bodies is written into SPEC.mdl so a future change has to argue with it.

## 2026-05-04 — Version the envelope rather than sniffing it

Sniffing works until a v1 payload happens to parse as v2. A version byte turns that into a refusal
with a readable message, which is what a field team needs to hear.

## 2026-04-28 — Convert v1 notes eagerly, in place

The alternative — read v1 forever behind a shim — leaves two formats live indefinitely and every
later change has to handle both. Converting on first open is a one-time cost and it has to be
idempotent, which is a thing a test can state.
`;

const OUTLINE_MD = `- [x] Agree the envelope version byte
- [x] Write SPEC.mdl and get Ravi to read it
- [ ] Decide on conflicting titles
  - [x] Write up the options
  - [ ] Get Noa to sign off
- [ ] Ask Sung-min what "saved" should look like on the device
- [ ] Book the Northwind survey window
`;

export type DocsResult = {
  spec: Markdown.Document;
  architecture: Markdown.Document;
  decisions: Markdown.Document;
  outline: Outline.Outline;
};

/** The project's written artifacts, plus the outline that backs its scratch checklist. */
export const Docs: SampleSpace.Phase<DocsResult> = SampleSpace.phase('docs', {
  schemas: [Markdown.Document, Outline.Outline],
  run: () =>
    Effect.gen(function* () {
      const spec = yield* Database.add(Markdown.make({ name: 'SPEC.mdl', content: SPEC_MDL }));
      const architecture = yield* Database.add(Markdown.make({ name: 'ARCHITECTURE.md', content: ARCHITECTURE_MD }));
      const decisions = yield* Database.add(Markdown.make({ name: 'DECISIONS.md', content: DECISIONS_MD }));
      const outline = yield* Database.add(Outline.make({ name: 'Working notes', content: OUTLINE_MD }));
      return { spec, architecture, decisions, outline };
    }),
});
