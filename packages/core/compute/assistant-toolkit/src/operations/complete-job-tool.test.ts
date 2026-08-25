//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import { describe, test } from 'vitest';

import { JsonSchema } from '@dxos/echo';

import { makeCompleteJobTool } from './complete-job-tool';

/** Anthropic rejects a strict tool whose schema contains one, so nothing may serialize to `{}`. */
const hasEmptySchema = (node: unknown): boolean => {
  if (Array.isArray(node)) {
    return node.some(hasEmptySchema);
  }
  if (node === null || typeof node !== 'object') {
    return false;
  }
  const entries = Object.entries(node);
  return entries.length === 0 || entries.some(([, value]) => hasEmptySchema(value));
};

describe('completeJob tool', () => {
  test('a declared output stays strict, and carries no empty schema', ({ expect }) => {
    const tool = makeCompleteJobTool(JsonSchema.toJsonSchema(Schema.String));
    expect(Tool.getStrictMode(tool)).toBe(true);
    expect(hasEmptySchema(Tool.getJsonSchema(tool))).toBe(false);
  });

  test('an undeclared output drops strict, because its payload schema is empty', ({ expect }) => {
    const tool = makeCompleteJobTool(JsonSchema.toJsonSchema(Schema.Void));
    expect(Tool.getStrictMode(tool)).toBe(false);
    expect(hasEmptySchema(Tool.getJsonSchema(tool))).toBe(true);
  });
});
