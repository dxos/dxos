//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import * as WeatherSpace from './WeatherSpace.ts';

/** A task as the archive serializes it: refs become `{ '/': 'echo:///<id>' }`. */
type ArchivedTask = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'dependsOn'?: Array<{ '/': string }>;
  'assignee'?: unknown;
};

describe('Weather MCP template', () => {
  test('builds the project, its skill and four steps, and nothing else', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(WeatherSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.instructions')).toBe(1);
    expect(countOf('type.skill')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(4);
    expect(countOf('type.document')).toBe(0);
  });

  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(WeatherSpace.make()));
    const declared = new Set(WeatherSpace.make().schemas.map((schema) => Type.getTypename(schema)));

    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // `spaceProperties` is the space root the harness creates, in every archive and no definition.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test(
    'four ordered steps, all the agent’s, each depending on the one before',
    { timeout: 120_000 },
    async ({ expect }) => {
      const tasks = await archived<ArchivedTask>('type.task:');

      expect(tasks.map((task) => task.title)).toEqual([
        'Build the weather MCP Worker',
        'Deploy it to a temporary Cloudflare account',
        'Configure the server for this space',
        'Test the tool from this chat',
      ]);
      expect(tasks.every((task) => task.status === 'todo')).toBe(true);
      // The run is unattended: a step assigned to the reader would stall it.
      expect(tasks.every((task) => task.assignee === undefined)).toBe(true);
      expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
        undefined,
        ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
      ]);
    },
  );

  test(
    'the seeded skill starts with no MCP server for the run to fill in',
    { timeout: 120_000 },
    async ({ expect }) => {
      const [skill] = await archived<{ mcpServers?: unknown[]; agentCanEnable?: boolean }>('type.skill');

      expect(skill?.mcpServers).toEqual([]);
      expect(skill?.agentCanEnable).toBe(true);
    },
  );
});

/** The archive's objects of one typename fragment, in the order they were written. */
const archived = async <T>(fragment: string): Promise<T[]> => {
  const { json } = await EffectEx.runPromise(buildArchive(WeatherSpace.make()));
  const objects: Array<{ '@type'?: string }> = JSON.parse(json).objects;
  return objects.filter((object) => object['@type']?.includes(fragment)) as T[];
};
