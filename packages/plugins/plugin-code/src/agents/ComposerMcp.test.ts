//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { makeRegistry } from '@dxos/echo-client';
import { DXN, SpaceId } from '@dxos/keys';
import { McpServer } from '@dxos/mcp-server';

import * as ComposerMcp from './ComposerMcp.ts';

const SPACE = SpaceId.random();
const SKILL = 'com.example.skill.notes';

const CreateNote = Operation.make({
  meta: { key: DXN.make('com.example.operation.notes.create'), name: 'Create Note' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
}).pipe(Operation.mutation('write'));

const setup = () => {
  const invocations: { input: unknown; spaceId: SpaceId | undefined }[] = [];
  const registry = makeRegistry({
    initial: [
      ...Operation.serializable([CreateNote]),
      Skill.make({
        key: SKILL,
        name: 'notes',
        description: 'Notes workflow.',
        mcpPrompt: true,
        instructions: Template.make({ source: 'Write notes.' }),
        tools: Skill.toolDefinitions({ operations: [CreateNote] }),
      }),
    ],
  });
  const host = ComposerMcp.host({
    handlers: Effect.succeed([CreateNote.pipe(Operation.withHandler(() => Effect.succeed({ id: 'note-1' })))]),
    invoke: (_operation, input, spaceId) =>
      Effect.sync(() => {
        invocations.push({ input, spaceId });
        return { id: 'note-1' };
      }),
    spaceIds: [SPACE],
  });
  return { invocations, ...ComposerMcp.handler({ registry, host, path: '/mcp/server-1' }) };
};

const call = async (
  handle: (request: Request) => Promise<Response>,
  method: string,
  params: { name?: string; arguments?: Record<string, unknown> } = {},
) => {
  const response = await handle(
    new Request('http://localhost/mcp/server-1', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': method,
        ...(params.name !== undefined && { 'mcp-name': params.name }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      }),
    }),
  );
  return response.json();
};

describe('ComposerMcp', () => {
  test("serves the app's operations: a skill unlocks one, which runs in the chat's space", async ({ expect }) => {
    const { handle, dispose, invocations } = setup();
    try {
      const listed = await call(handle, 'tools/list');
      expect(listed.result.tools.map((tool: { name: string }) => tool.name)).toEqual(
        expect.arrayContaining([...McpServer.TOOL_NAMES]),
      );

      const loaded = await call(handle, 'tools/call', { name: 'loadSkill', arguments: { skill: SKILL } });
      const skillToken = loaded.result.structuredContent.skillToken;
      expect(skillToken).toBeTypeOf('string');

      const invoked = await call(handle, 'tools/call', {
        name: 'invokeOperation',
        arguments: { key: 'com.example.operation.notes.create', input: { title: 'Hello' }, spaceId: SPACE, skillToken },
      });
      expect(invoked.result.isError).not.toBe(true);
      expect(JSON.stringify(invoked.result)).toContain('note-1');
      expect(invocations).toEqual([{ input: { title: 'Hello' }, spaceId: SPACE }]);
    } finally {
      await dispose();
    }
  });

  test('refuses another space and an operation the app does not have', async ({ expect }) => {
    const { handle, dispose, invocations } = setup();
    try {
      const loaded = await call(handle, 'tools/call', { name: 'loadSkill', arguments: { skill: SKILL } });
      const skillToken = loaded.result.structuredContent.skillToken;
      const elsewhere = await call(handle, 'tools/call', {
        name: 'invokeOperation',
        arguments: {
          key: 'com.example.operation.notes.create',
          input: { title: 'Hello' },
          spaceId: SpaceId.random(),
          skillToken,
        },
      });
      expect(elsewhere.result.isError).toBe(true);
      expect(invocations).toEqual([]);
    } finally {
      await dispose();
    }
  });
});
