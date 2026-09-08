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
// The brief is INPUT — what to build and what not to. The design (the mermaid diagrams) is the
// first task's output, so it is deliberately absent: seeding it would answer the question the
// project exists to work through.
//

const BRIEF_MD = `# Brief — chatroom on Workers

A chatroom anyone can deploy to their own Cloudflare account in an afternoon, built by an agent
working this project's tasks in order.

## Shape

One Worker. One Durable Object per room, holding the member list and the recent messages. A
WebSocket for fan-out. One HTML page as the client, served by the same Worker.

## Constraints

- **No database.** Room state lives in the Durable Object. A room that goes quiet may be evicted,
  and losing its backlog is acceptable.
- **No build step.** The client is one page of hand-written HTML and JavaScript.
- **No accounts.** A display name typed on join is the whole of identity.
- **Deployable by its owner.** Someone with a Cloudflare account and this repo gets a working URL
  from \`wrangler deploy\`, with no other setup.

## Out of scope

Authentication, moderation, message history beyond what the Durable Object holds, file uploads,
and more than one room per URL path.

## Done means

Two browser tabs open the same room URL, each sees the other join, and a message typed in one
appears in the other.
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
