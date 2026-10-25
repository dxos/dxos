//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-projects/Feature';

import * as ShogiSpace from '../shogi/ShogiSpace.ts';
import * as WorldClockSpace from '../world-clock/WorldClockSpace.ts';
import * as PluginSpace from './PluginSpace.ts';

/** A stand-in for what composer-app's build stamps. */
const TOOLCHAIN: PluginSpace.Toolchain = {
  toolchain: {
    commit: '0123abcd',
    versions: {
      'effect': '3.0.0',
      'react': '19.0.0',
      'react-dom': '19.0.0',
      '@types/react': '19.0.0',
      '@vitejs/plugin-react': '5.0.0',
      'typescript': '5.9.0',
      'vite': '7.0.0',
    },
  },
  edgeUrl: 'https://edge.example.test',
};

/** Any archived entity, with the fields the checks read; refs become `{ '/': 'echo:///<id>' }`. */
type Archived = {
  '@type'?: string;
  'id': string;
  'name'?: string;
  'title'?: string;
  'status'?: string;
  'specs'?: string[];
  'project'?: { '/': string };
  'dependsOn'?: Array<{ '/': string }>;
  'assignee'?: { role?: string; name?: string };
  '@relationSource'?: string;
  '@relationTarget'?: string;
  '@meta'?: { keys?: Array<{ source: string; id: string }> };
};

const ofType = (objects: Archived[], typename: string) =>
  objects.filter((object) => object['@type']?.includes(typename));

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe.each([ShogiSpace.CONFIG, WorldClockSpace.CONFIG])('$space.name template', (config) => {
  const build = () => EffectEx.runPromise(buildArchive(PluginSpace.make(config, TOOLCHAIN)));
  const archive = async (): Promise<Archived[]> => JSON.parse((await build()).json).objects;

  test(
    'builds the project, its three planning steps, the spec and the feature map, and nothing else',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json, objectCount } = await build();
      const counts = histogram(json);
      const countOf = (typename: string) =>
        Object.entries(counts)
          .filter(([type]) => type.includes(typename))
          .reduce((total, [, count]) => total + count, 0);

      expect(objectCount).toBeGreaterThan(0);
      expect(countOf('type.project')).toBe(1);
      expect(countOf('type.instructions')).toBe(1);
      expect(countOf('type.taskSet')).toBe(1);
      expect(countOf('type.task:')).toBe(3);
      expect(countOf('type.feature:')).toBe(4);
      expect(countOf('type.spec:')).toBe(1);
      // The diagram and the published plugin are what the run produces, so the space ships no documents.
      expect(countOf('type.document')).toBe(0);
    },
  );

  test(
    'the feature map files a feature per spec block, and opens the spec in the space',
    { timeout: 120_000 },
    async ({ expect }) => {
      const objects = await archive();
      const [project] = ofType(objects, 'type.project');
      const features = ofType(objects, 'type.feature:');
      const tasks = ofType(objects, 'type.task:');

      expect(features.map((feature) => feature.name)).toEqual(config.features.map((feature) => feature.name));
      expect(features.every((feature) => feature.status === 'planned')).toBe(true);
      expect(features.every((feature) => feature.project?.['/'] === `echo:///${project.id}`)).toBe(true);
      expect(features.map((feature) => feature.specs)).toEqual(
        ['F-1', 'F-2', 'F-3', 'F-4'].map((feat) => [`${config.spec.path}#${feat}`]),
      );

      // Each feature needs the one before it.
      const dependsOn = ofType(objects, 'relation.dependsOn');
      expect(dependsOn.map((relation) => [relation['@relationSource'], relation['@relationTarget']])).toEqual(
        features.slice(1).map((feature, index) => [`echo:///${feature.id}`, `echo:///${features[index].id}`]),
      );

      // Only the diagram is seeded against a feature, the first it draws; the agent links the tasks it files.
      const diagram = tasks.find((task) => task.title === PluginSpace.architecture(config).title);
      expect(
        ofType(objects, 'relation.implements').map((relation) => [
          relation['@relationSource'],
          relation['@relationTarget'],
        ]),
      ).toEqual([[`echo:///${diagram?.id}`, `echo:///${features[0].id}`]]);

      // The spec is the space's copy of the path the features cite, so their cards open it instead of GitHub.
      const [spec] = ofType(objects, 'type.spec:');
      expect(spec['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: config.spec.path }]);
    },
  );

  // The brief is the only place the agent learns what this build of Composer was made from, so a wrong pin
  // compiles the plugin against an API the app does not run.
  test('the instructions pin the plugin to the toolchain and publish to the given EDGE', ({ expect }) => {
    const text = PluginSpace.instructions(config, TOOLCHAIN);
    const { commit } = TOOLCHAIN.toolchain;
    expect(text).toContain(`https://raw.githubusercontent.com/dxos/dxos/${commit}/`);
    for (const dxosPackage of config.packages) {
      expect(text).toContain(`"@dxos/${dxosPackage}": "https://pkg.pr.new/@dxos/${dxosPackage}@${commit}"`);
    }
    expect(text).toContain(`"name": "${config.npmName}"`);
    expect(text).toContain(`named "${config.name}" in \`dx.config.ts\``);
    expect(text).toContain(`--package=https://pkg.pr.new/@dxos/cli@${commit}`);
    expect(text).toContain(`dx registry publish --private --no-build --edge-url ${TOOLCHAIN.edgeUrl}`);
  });

  // Falsifiable without hardcoding the archive's contents: every typename in the archive must be one
  // the definition DECLARED.
  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await build();
    const declared = new Set(PluginSpace.make(config, TOOLCHAIN).schemas.map((schema) => Type.getTypename(schema)));

    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // `spaceProperties` is the space root the harness creates, not a phase's content.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test('every step is todo, unassigned, and depends on the one before it', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = ofType(await archive(), 'type.task:');

    expect(tasks.map((task) => task.title)).toEqual([
      'Complete the spec',
      'Draw the proposed architecture',
      'Plan the implementation as tasks',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);
    // The agent files the implementation tasks, the reader's install among them, so no seeded task is assigned.
    expect(tasks.filter((task) => task.assignee !== undefined)).toEqual([]);
    expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
      undefined,
      ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
    ]);
  });
});
