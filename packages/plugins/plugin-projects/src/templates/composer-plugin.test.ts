//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';
import { Spec, Task, TaskSet } from '@dxos/types';

import { Feature, FeatureSpec } from '#types';

import {
  type Variant,
  WORLD_CLOCK_SPEC,
  WORLD_CLOCK_SPEC_PATH,
  composerPlugin,
  desktopVariant,
  makeComposerPlugin,
  registryVariant,
} from './composer-plugin.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

const TOOLCHAIN = {
  commit: COMMIT,
  versions: {
    'effect': '4.0.0',
    'react': '19.2.8',
    'react-dom': '19.2.8',
    '@types/react': '19.2.18',
    '@vitejs/plugin-react': '6.0.5',
    'typescript': '7.0.2',
    'vite': '8.3.1',
  },
};

describe('Composer Plugin project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const scaffold = async (variant: Variant = desktopVariant(TOOLCHAIN)) => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task, Spec.Spec],
    });
    const project = db.add(
      await EffectEx.runPromise(
        makeComposerPlugin(variant)
          .scaffold({})
          .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
      ),
    );
    await db.flush();
    return project;
  };

  test('one add persists a parent task over four chained subtasks', async ({ expect }) => {
    const project = await scaffold();
    const taskSet = await project.taskSet?.load();
    if (!taskSet) {
      throw new Error('the template must give the project its task set');
    }
    expect(taskSet.tasks).toHaveLength(1);
    const parent = await taskSet.tasks[0].load();
    expect(parent.title).toBe('Build the World Clock plugin');

    const subtasks = await Promise.all((parent.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks.map((task) => task.title)).toEqual([
      'Read the plugin guide',
      'Write the plugin in TypeScript',
      'Install, typecheck and build',
      'Offer the plugin to load',
    ]);
    expect(subtasks.every((task) => task.status === 'todo')).toBe(true);
    expect(subtasks[0].dependsOn ?? []).toHaveLength(0);
    for (const [index, task] of subtasks.entries()) {
      if (index > 0) {
        const dependencies = await Promise.all((task.dependsOn ?? []).map((ref) => ref.load()));
        expect(dependencies.map((dependency) => dependency.id)).toEqual([subtasks[index - 1].id]);
      }
    }
  });

  test('builds in a sandbox from public sources pinned to the commit the app was built from', async ({ expect }) => {
    const project = await scaffold();
    const instructions = await project.instructions?.load();
    expect(instructions?.skills.map((skill) => skill.uri.toString())).toEqual([
      expect.stringContaining('org.dxos.skill.sandbox'),
    ]);
    const text = (await instructions?.text?.load())?.content ?? '';
    expect(text).toContain('nothing but `bun` and `bunx`');
    expect(text).not.toMatch(/node_modules|ln -s/);

    const taskSet = await project.taskSet?.load();
    const parent = await taskSet?.tasks[0].load();
    const subtasks = await Promise.all((parent?.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks[0].description).toContain(`https://raw.githubusercontent.com/dxos/dxos/${COMMIT}/docs/`);
    expect(subtasks[1].description).toContain(
      `"@dxos/app-framework": "https://pkg.pr.new/@dxos/app-framework@${COMMIT}"`,
    );
    expect(subtasks[1].description).toContain('"react": "19.2.8"');
    expect(subtasks[2].description).toContain('bunx @pnpm/exe@10 install');
    expect(subtasks[3].description).toContain('Publish Files');
  });

  test('in a browser, builds on EDGE and publishes to the private registry as the reader', async ({ expect }) => {
    const project = await scaffold(registryVariant(TOOLCHAIN, 'https://edge.example.com/'));
    const text = (await (await project.instructions?.load())?.text?.load())?.content ?? '';
    expect(text).toContain('a container on EDGE');

    const taskSet = await project.taskSet?.load();
    const parent = await taskSet?.tasks[0].load();
    const subtasks = await Promise.all((parent?.subtasks ?? []).map((ref) => ref.load()));
    expect(subtasks.map((task) => task.title)).toEqual([
      'Read the plugin guide',
      'Write the plugin in TypeScript',
      'Install, typecheck and build',
      'Publish it to your registry',
    ]);
    const publish = subtasks[3].description ?? '';
    expect(publish).toContain(
      `npx --yes --package=https://pkg.pr.new/@dxos/cli@${COMMIT} dx registry publish --private --no-build --edge-url https://edge.example.com/`,
    );
    expect(publish).toContain('"Grant account access"');
    expect(publish).not.toContain('Publish Files');
  });

  test('publishes with the CLI the build names, when it names one', ({ expect }) => {
    const variant = registryVariant(
      { ...TOOLCHAIN, cli: 'https://cli.example.com/dx.tgz' },
      'https://edge.example.com/',
    );
    expect(variant.steps.at(-1)?.description).toContain('--package=https://cli.example.com/dx.tgz dx');
  });

  test('files the spec World Clock is built from as the project artifact the features cite', async ({ expect }) => {
    const project = await scaffold();
    expect(project.artifacts).toHaveLength(1);
    const spec = await project.artifacts[0].load();
    if (!Spec.isSpec(spec)) {
      throw new Error('the project artifact must be the spec');
    }
    expect(spec.name).toBe('World Clock');
    expect((await spec.content.load()).content).toBe(WORLD_CLOCK_SPEC);
    expect(Obj.getMeta(spec).keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: WORLD_CLOCK_SPEC_PATH }]);
    expect(FeatureSpec.parse(WORLD_CLOCK_SPEC).map((feature) => feature.id)).toEqual([
      'F-1',
      'F-2',
      'F-3',
      'F-4',
      'F-5',
    ]);
  });

  test.for([
    ['desktop', desktopVariant(TOOLCHAIN)],
    ['registry', registryVariant(TOOLCHAIN, 'https://edge.example.com/')],
  ] as const)('the %s build bundles the spec so the registry can open it', ([, variant], { expect }) => {
    const write = variant.steps[1].description ?? '';
    expect(write).toContain("spec: 'PLUGIN.mdl'");
    expect(write).toContain("import spec from '../PLUGIN.mdl?raw';");
    expect(write).toContain('ActivationEvents.PluginAssetsRequested');
    expect(write).toContain('AppCapabilities.PluginAsset');
    expect(write).toContain(`\`\`\`mdl\n${WORLD_CLOCK_SPEC.trim()}\n\`\`\``);
  });

  test('is offered in a browser only with a toolchain and an EDGE', ({ expect }) => {
    expect(composerPlugin()).toBeUndefined();
    expect(composerPlugin({}, TOOLCHAIN)).toBeUndefined();
    expect(composerPlugin({ edgeUrl: 'https://edge.example.com/' }, TOOLCHAIN)?.id).toBe(
      'org.dxos.project.composerPlugin',
    );
  });
});
