//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { JsonSchema } from '@dxos/echo';

import { InstallHarness, RunHarness } from './definitions';

/**
 * Model ids DeepSeek discontinued on 2026-07-24. They survive only as text an agent reads out of a
 * tool definition, so nothing else in the build would catch one coming back.
 */
const RETIRED_MODEL_IDS = ['deepseek-chat', 'deepseek-reasoner'];

/** Ids the description offers as examples; each must survive, not just the first. */
const CURRENT_MODEL_IDS = ['deepseek-v4-flash', 'deepseek-v4-pro'];

describe('DeepSeek operation definitions', () => {
  const serialized = [InstallHarness, RunHarness]
    .flatMap((operation) => [JsonSchema.toJsonSchema(operation.input), JsonSchema.toJsonSchema(operation.output)])
    .map((schema) => JSON.stringify(schema))
    .join('\n');

  test('no description names a retired model id', () => {
    for (const retired of RETIRED_MODEL_IDS) {
      expect(serialized).not.toContain(retired);
    }
  });

  test('the model parameter names the current ids', () => {
    const inputSchema = JSON.stringify(JsonSchema.toJsonSchema(RunHarness.input));
    for (const modelId of CURRENT_MODEL_IDS) {
      expect(inputSchema).toContain(modelId);
    }
  });
});
