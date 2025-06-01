//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, test } from 'vitest';

import { ObjectId } from '@dxos/echo-schema';

import { defineTool } from './define';
import { ToolResult } from './tools';

describe('tools', () => {
  test('should define a tool', () => {
    const tool = defineTool('test', {
      name: 'test',
      description: 'Test tool',
      schema: Schema.Struct({
        foo: Schema.String.annotations({
          description: 'Testing tool description.',
        }),
      }),
      execute: async ({ foo }) => {
        return ToolResult.Success(foo);
      },
    });
    expect(tool.parameters?.properties).toEqual({
      foo: {
        type: 'string',
        description: 'The foo',
      },
    });
  });

  test('use object id in tool parameters', () => {
    const tool = defineTool('test', {
      name: 'test',
      description: 'Test tool',
      schema: Schema.Struct({
        id: ObjectId.annotations({ description: 'The id' }),
      }),
      execute: async ({ id }) => {
        return ToolResult.Success(id);
      },
    });
    expect(tool.parameters?.properties?.id.description).toEqual('The id');
  });
});
