//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { TrajectoryStore } from '@dxos/assistant';
import { type Feed } from '@dxos/echo';
import { ContentBlock, Message } from '@dxos/types';

import * as Client from '../client/Client.ts';

export type MakeOptions = {
  feed: Feed.Feed;
  /** Subdirectory of the host's configured root; the host refuses anything outside it. */
  cwd?: string;
  maxTurns?: number;
  /** Host endpoint, when it is not mounted at the default path. */
  path?: string;
};

/** What the agent process asks a turn for: the prompt, the queued record it answers and the model. */
export type TurnParams = {
  prompt: string | ContentBlock.Any[];
  source?: TrajectoryStore.TurnSource;
  model?: Parameters<typeof TrajectoryStore.turn>[1]['model'];
};

/**
 * A turn producer backed by the Claude Agent SDK host.
 *
 * Satisfies `agent-runtime`'s `TurnProducer` so the agent process can run turns on the SDK while
 * keeping its own queue, alarms, redelivery, delegation and hydration. Messages are appended to the
 * feed as they stream, which is what makes them appear in the chat thread.
 *
 * The SDK keeps its own conversation state, so history is replayed by passing the session id back
 * as `resume` rather than by re-sending the feed.
 */
export const make = ({ feed, cwd, maxTurns, path }: MakeOptions) => {
  let session: string | undefined;

  // A scoped effect to match `MakeTurnProducer`; nothing to release — the host is reached over HTTP
  // and each turn is a single request.
  return Effect.succeed({
    // The SDK owns tool binding, so no DXOS skills are bound to this conversation and the process's
    // end-request hooks have nothing to fire. Bridging DXOS operations would go through MCP.
    getSkills: () => [],

    runTurn: ({ prompt, source, model }: TurnParams) => {
      const blocks: ContentBlock.Any[] = typeof prompt === 'string' ? [{ _tag: 'text', text: prompt }] : [...prompt];
      const text = blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join('\n');
      return TrajectoryStore.turn(feed, { prompt: Message.make({ sender: 'user', blocks }), source, model }, (append) =>
        Effect.gen(function* () {
          const messages: Message.Message[] = [];

          const frames = yield* Effect.promise(async () => {
            const collected: Client.Frame[] = [];
            for await (const frame of Client.run({ prompt: text, cwd, maxTurns, resume: session, path })) {
              if (Client.isEnd(frame)) {
                session = frame.sessionId;
              } else {
                collected.push(frame);
              }
            }
            return collected;
          });

          for (const frame of frames) {
            const message = Message.make({
              sender: frame.role,
              created: frame.created,
              threadId: frame.threadId,
              blocks: [...frame.blocks],
              properties: frame.properties,
            });
            messages.push(message);
            yield* append([message]);
          }

          return messages;
        }),
      );
    },
  });
};
