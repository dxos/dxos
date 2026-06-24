//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { vi } from 'vitest';

import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// TODO(dmaretskyi): Web search is bugged DX-1032.
/*
Diagnosis (runtime-confirmed)
Yes — that fixture is invalid/truncated. A well-formed Anthropic stream (even a paused one) always ends with a finish part; both conversations in web.conversations.json instead stop dead at tool-params-end, with no web_search_tool_result and no finish. I reproduced it live (the [DEBUG H1] log fired on every turn) and pulled the full error tree.

The response is cut short in two layers — it's both, but the trigger is effect-ai:

1. Root trigger — @effect/ai-anthropic bug. AnthropicTool.WebSearch_20250305 is declared with only args / success / failure and no per-call parameters. Tool.providerDefined therefore defaults its parametersSchema to EmptyParams ({ readonly [x: string]: never }). When the model actually calls web search with { query: "capital of France" }, effect-ai's own stream-part codec (Response.StreamPart(toolkit)) can't decode the aggregated tool-call part and throws MalformedOutput mid-stream. The exact failure:

ToolCallPart(AnthropicWebSearch)
  └─ ["params"]
     └─ { readonly [x: string]: never }
        └─ ["query"]
           └─ Expected never, actual "capital of France"
This happens right after tool-params-end, before effect-ai ever emits the web_search_tool_result or the finish/stop_reason. So effect-ai cannot round-trip its own provider web-search tool call.

2. Our bug — silent truncation. withoutToolCallParising (packages/core/compute/ai/src/util/tool-call-parsing.ts) catches that MalformedOutput and "recovers" by re-emitting only the parts buffered so far (minus tool-call) and closing the stream without error. That turns effect-ai's hard failure into a silent half-turn: server tool call, no results, no finish reason. Downstream, getToolCalls() filters out the provider-executed call → runAgentTurn returns done: true → the agent never sees results and never reaches completeJob → PromptError: Agent did not signal task completion. (And the recorder persists this truncated stream as the fixture, so replays reproduce it in 2.8s.)

This is also why web search has effectively never worked — websearch/skill.test.ts is tagged flaky/skipped.
 */
describe.only('Web', () => {
  it.effect(
    'search the web',
    agentTest({
      instructions: trim`
        Run a web search for the capital of France. I'm testing that the tool works, call "web-search" only.
      `,
      completionCriteria: ['The capital of France is returned.', 'The web-search tool was the only tool used.'],
      // TODO(dmaretskyi): Update to use skill keys and get skills from registry.
      skills: [Ref.make(WebSearchSkill.make())],
    }),
    { timeout: agentTestTimeout(), tags: ['flaky'] },
  );
});
