//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { TrajectoryStore } from '@dxos/assistant';
import { type ContentBlock, Message } from '@dxos/types';

import { type MakeTurnProducer, type TurnRequest } from '../agent-service/index.ts';

export type ScriptedTenantOptions = {
  /** The name the tenant answers as. */
  name: string;
  /** Its reply to a request (the request's text, without the `@name` that routed it). */
  reply: (request: string) => { text: string; delay?: number };
};

const requestText = (prompt: TurnRequest['prompt']): string =>
  (typeof prompt === 'string'
    ? prompt
    : prompt.flatMap((block: ContentBlock.Any) => (block._tag === 'text' ? [block.text] : [])).join(' ')
  )
    .replace(/^\s*@\S+\s*/, '')
    .trim();

/**
 * A stand-in for an external agent sharing a chat (e.g. Claude Code over ACP): it keeps no model of its own, and
 * writes each turn through `TrajectoryStore.turn` as an external producer does, in the light thread it is given.
 */
export const makeScriptedTenant =
  ({ name, reply }: ScriptedTenantOptions): MakeTurnProducer =>
  ({ feed }) =>
    Effect.succeed({
      getSkills: () => [],
      runTurn: (request: TurnRequest) => {
        const prompt = request.prompt;
        const { text, delay = 0 } = reply(requestText(prompt));
        const message = Message.make({
          sender: { role: 'user' },
          blocks: typeof prompt === 'string' ? [{ _tag: 'text', text: prompt }] : [...prompt],
        });
        return TrajectoryStore.turn(
          feed,
          { prompt: message, source: request.source, model: request.model, thread: request.thread },
          (append) =>
            Effect.gen(function* () {
              yield* Effect.sleep(delay);
              const answer = Message.make({ sender: { role: 'assistant', name }, blocks: [{ _tag: 'text', text }] });
              yield* append([answer]);
              return [answer];
            }),
        );
      },
    });
