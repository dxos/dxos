//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { StockfishSpace } from './index';

/**
 * The chess-MCP sample space is built on demand rather than committed, so this asserts its shape in
 * place of a fixture: if a schema it seeds changes incompatibly, the build fails here.
 */
describe('Chess MCP sample space', () => {
  test(
    'builds an archive with the project, its plan, its skill and the test position',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json, objectCount } = await EffectEx.runPromise(buildArchive(StockfishSpace()));
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
      expect(countOf('type.document')).toBe(1);
      // The position the finished server is pointed at: a Game wrapping a chess state.
      expect(countOf('type.game:')).toBe(1);
      expect(countOf('type.chess.state')).toBe(1);
      // Neither is seeded: stage four creates the server record and stage five the repository, so
      // seeding either would name a URL that does not exist.
      expect(countOf('type.assistant.mcpServer')).toBe(0);
      expect(countOf('type.repo')).toBe(0);
    },
  );

  test('the plan is one root, five stages, and their steps', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(StockfishSpace()));
    const objects: Array<{
      '@type'?: string;
      'id': string;
      'title'?: string;
      'status'?: string;
      'assignee'?: unknown;
      'parentTask'?: unknown;
      'dependsOn'?: unknown;
    }> = JSON.parse(json).objects;
    const tasks = objects.filter((object) => object['@type']?.includes('type.task:'));

    const roots = tasks.filter((task) => task.parentTask === undefined);
    expect(roots).toHaveLength(1);
    expect(roots[0].title).toBe('Ship a chess engine as an MCP server on Cloudflare Workers');

    // Refs serialize as an envelope, so parentage is matched by id within it.
    const childrenOf = (id: string) =>
      tasks.filter((task) => task.parentTask !== undefined && JSON.stringify(task.parentTask).includes(id));
    const stages = childrenOf(roots[0].id);
    expect(stages).toHaveLength(5);
    // Every stage has steps of its own, which is the depth the tree exists to carry.
    for (const stage of stages) {
      expect(childrenOf(stage.id).length).toBeGreaterThan(0);
    }
    expect(tasks).toHaveLength(1 + 5 + stages.flatMap((stage) => childrenOf(stage.id)).length);

    // Nothing has started: this space is a plan to run, not a project caught mid-flight.
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);

    // Four of the five stages depend on their predecessor; the first depends on nothing.
    expect(tasks.filter((task) => Array.isArray(task.dependsOn) && task.dependsOn.length > 0)).toHaveLength(4);
  });

  test(
    "only four steps are the reader's, and the two GitHub ones are last",
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await EffectEx.runPromise(buildArchive(StockfishSpace()));
      const objects: Array<{ '@type'?: string; 'id': string; 'title'?: string; 'assignee'?: unknown }> =
        JSON.parse(json).objects;
      const tasks = objects.filter((object) => object['@type']?.includes('type.task:'));

      // The reader owns only what an agent cannot do: a Composer setting, and the three steps that
      // need a browser. Nothing asks for an Anthropic key, and nothing asks for a Cloudflare login to
      // DEPLOY — claiming the account afterwards is the one Cloudflare step that is theirs.
      const mine = tasks.filter((task) => (task.assignee as { role?: string } | undefined)?.role === 'user');
      expect(mine.map((task) => task.title)).toEqual([
        'Select DeepSeek V4 Pro as the chat model',
        'Claim the temporary Cloudflare account',
        'Create an empty GitHub repository for the server',
        'Connect the GitHub credential, scoped to that repository',
      ]);
    },
  );

  test('the project binds the skill through its instructions', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(StockfishSpace()));
    const objects: Array<{ '@type'?: string; 'id': string; 'skills'?: unknown }> = JSON.parse(json).objects;

    const skill = objects.find((object) => object['@type']?.includes('type.skill'));
    const instructions = objects.find((object) => object['@type']?.includes('type.instructions'));
    expect(skill?.id).toBeDefined();
    // A Skill object in the space is not enabled by proximity: `instructions.skills` is the binding.
    expect(JSON.stringify(instructions?.skills)).toContain(String(skill?.id));
  });
});
