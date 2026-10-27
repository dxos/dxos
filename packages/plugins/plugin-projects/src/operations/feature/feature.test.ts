//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, Task } from '@dxos/types';

import { Feature, Showcase } from '#types';

import addDependency from './add-dependency.ts';
import createShowcase from './create-showcase.ts';
import create from './create.ts';
import getFeatures from './get-features.ts';
import importLinks from './import-links.ts';
import importSpec from './import-spec.ts';
import linkTask from './link-task.ts';
import removeDependency from './remove-dependency.ts';
import update from './update.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Feature.Feature,
      Feature.DependsOn,
      Feature.Implements,
      Project.Project,
      Instructions.Instructions,
      Showcase.Showcase,
      Showcase.Demonstrates,
      Task.Task,
      Milestone.Milestone,
      Text.Text,
      File.File,
      PullRequest.PullRequest,
    ],
  });

const ref = Ref.make;

describe('FeatureOperation.Create', () => {
  it.effect('defaults to planned and places the feature in the project given', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Inbox' }));
      const { feature } = yield* create.handler({ name: 'Provider sync', project: ref(project) });
      expect(feature.status).toBe('planned');
      expect(feature.project?.target?.id).toBe(project.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.Update', () => {
  it.effect('sets the fields given, replacing the requirement list, and keeps the rest', () =>
    Effect.gen(function* () {
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'planned', description: 'Kept.' }));
      yield* update.handler({
        feature: ref(sync),
        status: 'operational',
        specs: ['a.mdl#F-1'],
        requirements: [{ id: 'F-1.1', text: 'Mail arrives within a minute.' }],
      });
      expect(sync).toMatchObject({
        name: 'Sync',
        description: 'Kept.',
        status: 'operational',
        specs: ['a.mdl#F-1'],
        requirements: [{ id: 'F-1.1', text: 'Mail arrives within a minute.' }],
      });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('moves a feature under a parent, off its project, and refuses its own subfeature', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Inbox' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'planned', project: ref(project) }));
      const gmail = yield* Database.add(Feature.make({ name: 'Gmail', status: 'planned', project: ref(project) }));
      yield* update.handler({ feature: ref(gmail), parent: ref(sync) });
      expect(gmail.parent?.target?.id).toBe(sync.id);
      expect(gmail.project).toBeUndefined();

      const exit = yield* Effect.exit(update.handler({ feature: ref(sync), parent: ref(gmail) }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(sync.parent).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.ImportSpec', () => {
  const spec = (requirement: string) => `
\`\`\`mdl
feat F-1: Sync
  Mail arrives without a refresh.
  req F-1.1: ${requirement}
\`\`\`
`;

  it.effect('creates a feature per feat block and updates its requirements on a second import', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Inbox' }));
      const first = yield* importSpec.handler({
        path: 'packages/a/PLUGIN.mdl',
        text: spec('New mail shows within a minute.'),
        project: ref(project),
      });
      expect(first.created).toHaveLength(1);
      const [feature] = yield* Database.query(Filter.type(Feature.Feature)).run;
      expect(feature).toMatchObject({
        name: 'Sync',
        description: 'Mail arrives without a refresh.',
        status: 'planned',
        specs: ['packages/a/PLUGIN.mdl#F-1'],
        requirements: [{ id: 'F-1.1', text: 'New mail shows within a minute.' }],
      });
      expect(feature.project?.target?.id).toBe(project.id);

      const second = yield* importSpec.handler({
        path: 'packages/a/PLUGIN.mdl',
        text: spec('New mail shows within ten seconds.'),
      });
      expect(second).toEqual({ created: [], updated: [feature.id] });
      expect(feature.requirements).toEqual([{ id: 'F-1.1', text: 'New mail shows within ten seconds.' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('imports every block of a shared fence and nests a dotted feature under its parent', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Inbox' }));
      const { created } = yield* importSpec.handler({
        path: 'packages/a/PLUGIN.mdl',
        text: [
          '```mdl',
          'feat F-1.1: Push',
          '  req F-1.1.1: Pushes.',
          '',
          'feat F-1: Sync',
          'feat F-2: Search',
          '```',
        ].join('\n'),
        project: ref(project),
      });
      expect(created).toHaveLength(3);
      const features = yield* Database.query(Filter.type(Feature.Feature)).run;
      const byName = new Map(features.map((feature) => [feature.name, feature]));
      expect(byName.get('Push')?.parent?.target?.id).toBe(byName.get('Sync')?.id);
      expect(byName.get('Push')?.project).toBeUndefined();
      expect(byName.get('Sync')?.project?.target?.id).toBe(project.id);
      expect(byName.get('Search')?.project?.target?.id).toBe(project.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.AddDependency', () => {
  it.effect('is idempotent and refuses a cycle, naming it', () =>
    Effect.gen(function* () {
      const accounts = yield* Database.add(Feature.make({ name: 'Accounts', status: 'operational' }));
      const tokens = yield* Database.add(Feature.make({ name: 'Tokens', status: 'operational' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      yield* addDependency.handler({ feature: ref(tokens), dependsOn: ref(accounts) });
      yield* addDependency.handler({ feature: ref(tokens), dependsOn: ref(accounts) });
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      expect(yield* Database.query(Filter.type(Feature.DependsOn)).run).toHaveLength(2);

      const exit = yield* Effect.exit(addDependency.handler({ feature: ref(accounts), dependsOn: ref(sync) }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(String(Exit.isFailure(exit) && exit.cause)).toContain(
        'Accounts → Sync → Tokens → Accounts would close a cycle',
      );
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.RemoveDependency', () => {
  it.effect('removes only the named edge', () =>
    Effect.gen(function* () {
      const accounts = yield* Database.add(Feature.make({ name: 'Accounts', status: 'operational' }));
      const tokens = yield* Database.add(Feature.make({ name: 'Tokens', status: 'operational' }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype' }));
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      yield* addDependency.handler({ feature: ref(sync), dependsOn: ref(accounts) });
      yield* removeDependency.handler({ feature: ref(sync), dependsOn: ref(tokens) });
      const remaining = yield* Database.query(Query.select(Filter.id(sync.id)).sourceOf(Feature.DependsOn).target())
        .run;
      expect(remaining.map(({ id }) => id)).toEqual([accounts.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.LinkTask', () => {
  it.effect('links a task once however often it is called', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'planned' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      const tasks = yield* Database.query(Query.select(Filter.id(compose.id)).targetOf(Feature.Implements)).run;
      expect(tasks).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.CreateShowcase', () => {
  it.effect('writes nothing when a target does not resolve', () =>
    Effect.gen(function* () {
      const gone = yield* Database.add(Feature.make({ name: 'Gone', status: 'planned' }));
      yield* Database.remove(gone);
      yield* Database.flush();
      const exit = yield* Effect.exit(createShowcase.handler({ name: 'Orphan', content: '', targets: [ref(gone)] }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(yield* Database.query(Filter.type(Showcase.Showcase)).run).toHaveLength(0);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('demonstrates every target and keeps its artifacts as refs', () =>
    Effect.gen(function* () {
      const compose = yield* Database.add(Feature.make({ name: 'Compose', status: 'operational' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail' }));
      const pullRequest = yield* Database.add(
        PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Send', state: 'open' }),
      );
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: 'Reply from the inbox.',
        targets: [ref(compose), ref(task)],
        artifacts: [ref(pullRequest)],
      });
      for (const target of [compose, task]) {
        const shown = yield* Database.query(Query.select(Filter.id(target.id)).targetOf(Showcase.Demonstrates).source())
          .run;
        expect(shown.map(({ id }) => id)).toEqual([showcase.id]);
      }
      expect(showcase.artifacts).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.Update project', () => {
  it.effect('moves a feature between projects and takes it off, keeping the feature', () =>
    Effect.gen(function* () {
      const inbox = yield* Database.add(Project.make({ name: 'Inbox' }));
      const mail = yield* Database.add(Project.make({ name: 'Mail' }));
      const compose = yield* Database.add(
        Feature.make({ name: 'Compose', status: 'planned', project: ref(inbox), position: { x: 1, y: 2 } }),
      );
      yield* update.handler({ feature: ref(compose), project: ref(mail) });
      expect(compose.project?.target?.id).toBe(mail.id);
      // A position belongs to the canvas it was dragged on, so it does not follow the feature.
      expect(compose.position).toBeUndefined();
      yield* update.handler({ feature: ref(compose), project: null });
      expect(compose.project).toBeUndefined();
      expect(yield* Database.query(Filter.type(Feature.Feature)).run).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.GetFeatures', () => {
  it.effect('reads each member with its dependencies, tasks, showcases and subfeatures', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Inbox' }));
      const compose = yield* Database.add(
        Feature.make({
          name: 'Compose',
          status: 'planned',
          requirements: [{ text: 'Replies thread under the original.' }],
          project: ref(project),
        }),
      );
      const drafts = yield* Database.add(Feature.make({ name: 'Drafts', status: 'planned', parent: ref(compose) }));
      const sync = yield* Database.add(Feature.make({ name: 'Sync', status: 'prototype', project: ref(project) }));
      yield* Database.add(Feature.make({ name: 'Elsewhere', status: 'planned' }));
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* addDependency.handler({ feature: ref(compose), dependsOn: ref(sync) });
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      const { showcase } = yield* createShowcase.handler({
        name: 'Sending a reply',
        content: 'Reply from the inbox.',
        targets: [ref(compose)],
      });

      yield* Database.flush();

      const result = yield* getFeatures.handler({ project: ref(project) });
      expect(result.features.map(({ name }) => name)).toEqual(['Compose', 'Drafts', 'Sync']);
      expect(result.features[1].parent).toBe(compose.id);
      expect(drafts.parent?.target?.id).toBe(compose.id);
      expect(result.features[0]).toMatchObject({
        requirements: [{ text: 'Replies thread under the original.' }],
        dependsOn: [sync.id],
        tasks: [{ id: task.id, title: 'Send through Gmail', status: 'started' }],
        showcases: [{ id: showcase.id, name: 'Sending a reply' }],
      });
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation key', () => {
  it.effect('create sets meta.key, update replaces it and null removes it', () =>
    Effect.gen(function* () {
      const { feature } = yield* create.handler({ name: 'Code mode', key: 'network.dxos.team.features.mcp.codeMode' });
      expect(Feature.getLink(feature)).toBe(`dxn:network.dxos.team.features.mcp.codeMode#${Obj.getMnemonic(feature)}`);
      yield* update.handler({ feature: ref(feature), key: 'network.dxos.team.features.mcp.sandbox' });
      expect(Obj.getMeta(feature).key).toBe('network.dxos.team.features.mcp.sandbox');
      yield* update.handler({ feature: ref(feature), key: null });
      expect(Obj.getMeta(feature).key).toBeUndefined();
      expect(Feature.getLink(feature)).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.ImportLinks', () => {
  it.effect('replaces the code links of each feature it resolves and reports the rest', () =>
    Effect.gen(function* () {
      const { feature: codeMode } = yield* create.handler({
        name: 'Code mode',
        key: 'network.dxos.team.features.mcp.codeMode',
      });
      const { feature: sandbox } = yield* create.handler({ name: 'Sandbox', key: 'org.example.features.sandbox' });
      yield* update.handler({ feature: ref(sandbox), name: 'Sandbox' });
      const codeModeLink = `dxn:network.dxos.team.features.mcp.codeMode#${Obj.getMnemonic(codeMode)}`;
      // The tag still cites the sandbox by its old key.
      const renamedLink = `dxn:org.example.features.oldSandbox#${Obj.getMnemonic(sandbox)}`;
      const result = yield* importLinks.handler({
        links: [
          { dxn: codeModeLink, path: 'src/a.test.ts', line: 3, kind: 'suite', symbol: 'code mode' },
          { dxn: codeModeLink, path: 'src/a.test.ts', line: 9, kind: 'test', symbol: 'runs' },
          { dxn: renamedLink, path: 'src/b.ts', line: 1, kind: 'code', symbol: 'track' },
          { dxn: 'dxn:org.example.features.gone#ZZZZZZ', path: 'src/c.ts', line: 4, kind: 'code' },
        ],
      });
      expect(result.features).toBe(2);
      expect(result.unresolved).toEqual([
        { dxn: 'dxn:org.example.features.gone#ZZZZZZ', path: 'src/c.ts', line: 4, status: 'missing' },
      ]);
      expect(result.outdated).toEqual([{ dxn: renamedLink, link: Feature.getLink(sandbox), status: 'renamed' }]);
      expect(codeMode.code).toEqual([
        { path: 'src/a.test.ts', line: 3, kind: 'suite', symbol: 'code mode' },
        { path: 'src/a.test.ts', line: 9, kind: 'test', symbol: 'runs' },
      ]);
      expect(sandbox.code).toEqual([{ path: 'src/b.ts', line: 1, kind: 'code', symbol: 'track' }]);

      // A second import replaces, rather than appends to, the links of the features it resolves.
      yield* importLinks.handler({ links: [{ dxn: codeModeLink, path: 'src/a.test.ts', line: 4, kind: 'suite' }] });
      expect(codeMode.code).toEqual([{ path: 'src/a.test.ts', line: 4, kind: 'suite' }]);
      expect(sandbox.code).toHaveLength(1);
    }).pipe(Effect.provide(testLayer())),
  );
});
