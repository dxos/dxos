//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { SCRIPTED_QUERY_TURNS, countTurnsSincePrompt } from './scripted-assistant.ts';

const { reasoning, text, toolCall } = ScriptedLanguageModel;

const QUERY_TOOL = Operation.toolName(SpaceOperation.QueryObjects);

/** Rotated so successive turns exercise different query paths: by type, full-text, and unfiltered. */
const QUERIES: readonly { label: string; input: Record<string, unknown> }[] = [
  { label: 'projects', input: { typename: 'org.dxos.type.project', includeContent: true } },
  { label: 'tasks', input: { typename: 'org.dxos.type.task', limit: 50 } },
  { label: 'documents', input: { typename: 'org.dxos.type.markdown.document' } },
  { label: 'tasks mentioning "zephyr"', input: { text: 'zephyr', limit: 25 } },
  { label: 'everything', input: { limit: 100 } },
];

/**
 * Gives a rendered turn time to be seen: a zero-latency model finishes 20 turns inside one frame,
 * which measures nothing a user would feel of a real stream.
 */
const TURN_DELAY = '250 millis';

const generate: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Titles, summaries and other side calls offer no tools; answer them rather than emitting a call
  // nobody can dispatch.
  if (!request.tools.includes(QUERY_TOOL)) {
    return { parts: [text('Scripted conversation')] };
  }

  const turn = countTurnsSincePrompt(request.prompt, QUERY_TOOL);
  if (turn >= SCRIPTED_QUERY_TURNS) {
    return {
      delay: TURN_DELAY,
      parts: [
        reasoning(`All ${SCRIPTED_QUERY_TURNS} queries returned; summarizing.`),
        text(`Done — ran ${SCRIPTED_QUERY_TURNS} database queries across ${QUERIES.length} query shapes.`),
      ],
    };
  }

  const query = QUERIES[turn % QUERIES.length];
  return {
    delay: TURN_DELAY,
    parts: [
      reasoning(`Turn ${turn + 1} of ${SCRIPTED_QUERY_TURNS}: the next thing to check is ${query.label}.`),
      text(`<status>Querying ${query.label} (${turn + 1}/${SCRIPTED_QUERY_TURNS})</status>`),
      toolCall(QUERY_TOOL, query.input),
    ],
  };
};

/**
 * One model shared by every resolution, like `scriptedAiServiceMiddleware`; the generator keeps no
 * cursor, so the share only saves reconstructing it.
 */
const model = Effect.runSync(Effect.cached(ScriptedLanguageModel.makeScriptedLanguageModel(generate)));

export const makeScriptedModel = () => Effect.succeed(Layer.effect(LanguageModel.LanguageModel, model));
