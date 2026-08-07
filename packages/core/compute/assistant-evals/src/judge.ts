//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { trim } from '@dxos/util';

// A judge grades open-ended quality cheaply — no agentic tool loop, just a classification call —
// so a fast/cheap model is enough; the scenario under test already ran on its own configured model.
const JUDGE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const JudgeVerdict = Schema.Struct({
  pass: Schema.Boolean,
  reasoning: Schema.String.annotations({ description: 'One sentence explaining the verdict.' }),
});

export interface JudgeVerdict extends Schema.Schema.Type<typeof JudgeVerdict> {}

/**
 * LLM-as-judge assertion (TESTING.md dimensions A/B/H) — grades open-ended quality that a
 * deterministic check can't (e.g. "is this a well-formed haiku about X"). Unlike `assertions.ts`'s
 * helpers, the verdict is model output, not deterministic — pair it with a dimension-G check for
 * the same scenario where one exists, never rely on it alone.
 */
export const judge = (rubric: string, content: string): Effect.Effect<JudgeVerdict, unknown, never> =>
  LanguageModel.generateObject({
    prompt: trim`
      ${rubric}

      <content>
      ${content}
      </content>
    `,
    schema: JudgeVerdict,
  }).pipe(
    Effect.provide(AiService.model(JUDGE_MODEL)),
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((response) => response.value),
  );
