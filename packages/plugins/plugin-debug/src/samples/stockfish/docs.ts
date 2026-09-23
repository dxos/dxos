//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

//
// The one artifact this space ships with.
//
// The brief is INPUT — what to build and what not to. The design (the tool surface and the request
// path) is the first task's output, so it is deliberately absent: seeding it would answer the
// question the project exists to work through.
//

const BRIEF_MD = `# Brief — chess engine as an MCP server on Workers

A chess engine any chat in this space can consult, built as one Cloudflare Worker speaking MCP and
registered against this space. The reader runs it end to end from the assistant, with no Cloudflare
account, no GitHub account until the last stage, and no Anthropic key at any point.

## Shape

One Worker. One Streamable-HTTP MCP endpoint on it. Two tools — evaluate a position, and name the
best move from it — over a chess engine compiled to WebAssembly and bundled into the Worker.

## Constraints

- **No database.** Every request carries the position as FEN; the Worker holds nothing between
  requests, so it can be evicted and restarted freely.
- **No accounts to start.** The first deploy uses wrangler's unauthenticated mode, which mints a
  temporary Cloudflare account and prints a URL to claim it. GitHub comes last, and only to publish.
- **No Anthropic key.** The chat driving this runs DeepSeek V4 Pro through the DXOS edge.
- **Written by the assistant, not delegated.** The assistant edits and runs things itself in the
  sandbox. The coding harness pre-installed in the sandbox image is not the path — see the
  Development skill.
- **Bounded search.** A fixed, low depth or a fixed millisecond budget per call. An MCP tool that
  thinks for thirty seconds is a tool a chat gives up on.

## Out of scope

Opening books, endgame tablebases, multi-PV analysis, game persistence, per-caller rate limiting,
and authentication beyond the shared key the MCP server record already carries.

## Done means

The Worker is registered as an MCP server in this space, and a chat opened on the seeded game
answers "what is the best move here?" from the engine's reply rather than from its own knowledge —
visible as a tool call in the transcript.
`;

export type DocsResult = { brief: Markdown.Document };

/** The project's brief: the requirement the first task designs against. */
export const Docs: SampleSpace.Phase<DocsResult> = SampleSpace.phase('docs', {
  schemas: [Markdown.Document],
  run: () =>
    Effect.gen(function* () {
      const brief = yield* Database.add(Markdown.make({ name: 'BRIEF.md', content: BRIEF_MD }));
      return { brief };
    }),
});
