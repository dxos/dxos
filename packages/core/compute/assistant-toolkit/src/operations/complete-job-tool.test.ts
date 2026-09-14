//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import { describe, test } from 'vitest';

import { JsonSchema } from '@dxos/echo';

import { makeCompleteJobParameters, makeCompleteJobTool } from './complete-job-tool.ts';

/**
 * Anthropic rejects tool schemas containing an empty (`{}`) or typeless subschema, and a
 * schema-less `success` invites the model to emit invalid JSON — every node must state a type.
 */
const collectTypeless = (node: unknown, path: string, inKeyMap: boolean, out: string[]): void => {
  if (Array.isArray(node)) {
    node.forEach((entry, index) => collectTypeless(entry, `${path}.${index}`, false, out));
  } else if (node && typeof node === 'object') {
    const schema = node as Record<string, unknown>;
    if (!inKeyMap && !['type', 'anyOf', 'oneOf', 'enum', 'const', '$ref'].some((key) => key in schema)) {
      out.push(path);
    }
    for (const [key, value] of Object.entries(schema)) {
      collectTypeless(value, `${path}.${key}`, key === 'properties' || key === '$defs', out);
    }
  }
};

const typelessNodes = (json: unknown): string[] => {
  const out: string[] = [];
  collectTypeless(json, 'root', false, out);
  return out;
};

describe('completeJob tool', () => {
  test('a declared output serializes with no typeless subschema', ({ expect }) => {
    const tool = makeCompleteJobTool(JsonSchema.toJsonSchema(Schema.String));
    expect(typelessNodes(Tool.getJsonSchema(tool))).toEqual([]);
  });

  test('an undeclared output advertises concrete payload types, and still decodes any JSON value', ({ expect }) => {
    const output = JsonSchema.toJsonSchema(Schema.Void);
    expect(typelessNodes(Tool.getJsonSchema(makeCompleteJobTool(output)))).toEqual([]);

    const decode = Schema.decodeUnknownSync(makeCompleteJobParameters(output));
    for (const success of ['summary', 42, true, { summary: 'done', artifactIds: ['1'] }, ['a', 'b']]) {
      expect(decode({ success })).toEqual({ success });
    }
  });

  test('a declared `null` output is treated as undeclared, which the stored schema cannot distinguish', ({
    expect,
  }) => {
    expect(JsonSchema.toJsonSchema(Schema.Null)).toEqual(JsonSchema.toJsonSchema(Schema.Void));
    expect(typelessNodes(Tool.getJsonSchema(makeCompleteJobTool(JsonSchema.toJsonSchema(Schema.Null))))).toEqual([]);
  });
});
