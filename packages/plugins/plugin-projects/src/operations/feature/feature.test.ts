//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, SpecDocument, Task } from '@dxos/types';

import { Feature, FeatureOperation, Showcase, Spec } from '#types';

import addDependency from './add-dependency.ts';
import createSpec from './create-spec.ts';
import create from './create.ts';
import deleteFeature from './delete.ts';
import getFeatures from './get-features.ts';
import importLinks from './import-links.ts';
import importSpec from './import-spec.ts';
import linkTask from './link-task.ts';
import removeDependency from './remove-dependency.ts';
import updateSpec from './update-spec.ts';
import update from './update.ts';

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Spec.Spec,
      SpecDocument.SpecDocument,
      Feature.Feature,
      Feature.DependsOn,
      Feature.Implements,
      Project.Project,
      Instructions.Instructions,
      Markdown.Document,
      Showcase.Demonstrates,
      Task.Task,
      Milestone.Milestone,
      Text.Text,
      File.File,
      PullRequest.PullRequest,
    ],
  });

const ref = Ref.make;

const addSpec = (name = 'Inbox') => Database.add(Spec.make({ name }));

const featureIds = (spec: Spec.Spec) => spec.features.map((feature) => feature.target?.id);

describe('FeatureOperation.Create', () => {
  it.effect('defaults to planned and lists the feature on the spec given, which becomes its parent', () =>
    Effect.gen(function* () {
      const spec = yield* addSpec();
      const { feature } = yield* create.handler({ name: 'Provider sync', spec: ref(spec) });
      expect(feature.status).toBe('planned');
      expect(featureIds(spec)).toEqual([feature.id]);
      expect(Spec.getContainer(feature)?.id).toBe(spec.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('places a subfeature on the spec that breaks its parent down, making it once', () =>
    Effect.gen(function* () {
      const spec = yield* addSpec();
      const { feature: sync } = yield* create.handler({ name: 'Sync', spec: ref(spec) });
      const { feature: gmail } = yield* create.handler({ name: 'Gmail', parent: ref(sync) });
      const { feature: imap } = yield* create.handler({ name: 'IMAP', parent: ref(sync) });
      const breakdown = sync.spec?.target;
      expect(breakdown?.name).toBe('Sync');
      expect(breakdown && featureIds(breakdown)).toEqual([gmail.id, imap.id]);
      expect(breakdown && Spec.getOwner(breakdown)?.id).toBe(sync.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('refuses a feature with neither a spec nor a parent', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(create.handler({ name: 'Orphan' }));
      expect(Exit.isFailure(exit)).toBe(true);
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

  it.effect('moves a feature between specs, leaving its position, and refuses its own breakdown', () =>
    Effect.gen(function* () {
      const inbox = yield* addSpec('Inbox');
      const { feature: sync } = yield* create.handler({ name: 'Sync', spec: ref(inbox) });
      const { feature: gmail } = yield* create.handler({ name: 'Gmail', spec: ref(inbox) });
      Obj.update(inbox, (inbox) => {
        inbox.layout = { positions: { [gmail.id]: { x: 1, y: 2 } } };
      });
      const { spec: breakdown } = yield* createSpec.handler({ name: 'Sync', feature: ref(sync) });
      yield* update.handler({ feature: ref(gmail), spec: ref(breakdown) });
      expect(featureIds(inbox)).toEqual([sync.id]);
      expect(featureIds(breakdown)).toEqual([gmail.id]);
      expect(Spec.getContainer(gmail)?.id).toBe(breakdown.id);
      // A position belongs to the canvas it was dragged on, so it does not follow the feature.
      expect(inbox.layout?.positions[gmail.id]).toBeUndefined();

      const exit = yield* Effect.exit(update.handler({ feature: ref(sync), spec: ref(breakdown) }));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(Spec.getContainer(sync)?.id).toBe(inbox.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.CreateSpec', () => {
  it.effect('refuses a second spec for a project, naming the one it has, and writes nothing', () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Mail' }));
      const { spec: inbox } = yield* createSpec.handler({ name: 'Inbox', project: ref(project) });
      const { feature: sync } = yield* create.handler({ name: 'Sync', spec: ref(inbox) });

      const error = yield* Effect.flip(createSpec.handler({ name: 'Outbox', project: ref(project) }));
      expect(error).toBeInstanceOf(FeatureOperation.ProjectHasSpecError);
      expect(error.message).toContain('"Inbox"');
      const breakdown = yield* Effect.flip(
        createSpec.handler({ name: 'Sync', feature: ref(sync), project: ref(project) }),
      );
      expect(breakdown).toBeInstanceOf(FeatureOperation.BreakdownSpecError);
      expect(sync.spec).toBeUndefined();
      expect(yield* Database.query(Filter.type(Spec.Spec)).run).toHaveLength(1);
      expect(Spec.getProject(inbox)?.id).toBe(project.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.UpdateSpec', () => {
  it.effect('moves a spec between projects, refuses a project that has one, and releases it on null', () =>
    Effect.gen(function* () {
      const mail = yield* Database.add(Project.make({ name: 'Mail' }));
      const chat = yield* Database.add(Project.make({ name: 'Chat' }));
      const { spec: inbox } = yield* createSpec.handler({ name: 'Inbox', project: ref(mail) });
      const outbox = yield* addSpec('Outbox');

      const error = yield* Effect.flip(updateSpec.handler({ spec: ref(outbox), project: ref(mail) }));
      expect(error.message).toContain('"Inbox"');
      expect(Spec.getProject(outbox)).toBeUndefined();

      yield* updateSpec.handler({ spec: ref(inbox), project: ref(chat) });
      expect(Spec.getProject(inbox)?.id).toBe(chat.id);
      expect(mail.spec).toBeUndefined();

      yield* updateSpec.handler({ spec: ref(inbox), project: null });
      expect(Spec.getProject(inbox)).toBeUndefined();
      expect(chat.spec).toBeUndefined();
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
        name: 'Inbox',
        project: ref(project),
      });
      expect(first.created).toHaveLength(1);
      const [target] = yield* Database.query(Filter.type(Spec.Spec)).run;
      expect(target).toMatchObject({ id: first.spec, name: 'Inbox' });
      expect(Spec.getProject(target)?.id).toBe(project.id);
      const document = yield* Database.load(target.document);
      expect(document.name).toBe('packages/a/PLUGIN.mdl');
      const [feature] = yield* Database.query(Filter.type(Feature.Feature)).run;
      expect(feature).toMatchObject({
        name: 'Sync',
        description: 'Mail arrives without a refresh.',
        status: 'planned',
        specs: ['packages/a/PLUGIN.mdl#F-1'],
        requirements: [{ id: 'F-1.1', text: 'New mail shows within a minute.' }],
      });
      expect(featureIds(target)).toEqual([feature.id]);

      // Without a target, the second import finds the spec by its document and rewrites the text in place.
      const second = yield* importSpec.handler({
        path: 'packages/a/PLUGIN.mdl',
        text: spec('New mail shows within ten seconds.'),
      });
      expect(second).toEqual({ spec: target.id, created: [], updated: [feature.id] });
      expect(feature.requirements).toEqual([{ id: 'F-1.1', text: 'New mail shows within ten seconds.' }]);
      expect(yield* Database.query(Filter.type(Spec.Spec)).run).toHaveLength(1);
      const content = yield* Database.load(document.content);
      expect(content.content).toContain('ten seconds');
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.ImportSpec into an explicit spec', () => {
  const text = `
\`\`\`mdl
feat F-1: Sync
  req F-1.1: Mail arrives within a minute.
\`\`\`
`;

  it.effect('takes the features its text declares and re-keys the document to the new path', () =>
    Effect.gen(function* () {
      const first = yield* importSpec.handler({ path: 'packages/a/PLUGIN.mdl', text, name: 'A' });
      const target = yield* addSpec('B');
      yield* importSpec.handler({ path: 'packages/a/PLUGIN.mdl', text, spec: ref(target) });
      const [feature] = yield* Database.query(Filter.type(Feature.Feature)).run;
      expect(Spec.getContainer(feature)?.id).toBe(target.id);
      const [source] = (yield* Database.query(Filter.type(Spec.Spec)).run).filter(({ id }) => id === first.spec);
      expect(source?.features).toHaveLength(0);
      // The path moves to the target's document, so the next import without a target finds the target.
      const keyed = yield* Database.query(
        Filter.foreignKeys(SpecDocument.SpecDocument, [
          { source: Feature.SPEC_KEY_SOURCE, id: 'packages/a/PLUGIN.mdl' },
        ]),
      ).run;
      expect(keyed.map((document) => Obj.getParent(document)?.id)).toEqual([target.id]);
      expect(Obj.getMeta(yield* Database.load(source.document)).keys).toEqual([]);

      yield* importSpec.handler({ path: 'packages/b/PLUGIN.mdl', text, spec: ref(target) });
      const document = yield* Database.load(target.document);
      expect(Obj.getMeta(document).keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: 'packages/b/PLUGIN.mdl' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('leaves a feature where it is when the target is its own breakdown', () =>
    Effect.gen(function* () {
      const first = yield* importSpec.handler({ path: 'packages/a/PLUGIN.mdl', text, name: 'A' });
      const [feature] = yield* Database.query(Filter.type(Feature.Feature)).run;
      const { spec: target } = yield* createSpec.handler({ name: 'Sync', feature: ref(feature) });
      const changed = text.replace('within a minute', 'within ten seconds');
      yield* importSpec.handler({ path: 'packages/a/PLUGIN.mdl', text: changed, spec: ref(target) });
      expect(Spec.getContainer(feature)?.id).toBe(first.spec);
      expect(target.features).toHaveLength(0);
      // The source keeps the path's document, updated, so deleting the feature cannot take it with the breakdown.
      const [source] = (yield* Database.query(Filter.type(Spec.Spec)).run).filter(({ id }) => id === first.spec);
      const document = yield* Database.load(source.document);
      expect(Obj.getParent(document)?.id).toBe(first.spec);
      const content = yield* Database.load(document.content);
      expect(content.content).toBe(changed);
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

describe('FeatureOperation.Delete', () => {
  it.effect('takes the feature off its spec and deletes its breakdown with it', () =>
    Effect.gen(function* () {
      const inbox = yield* addSpec('Inbox');
      const { feature: sync } = yield* create.handler({ name: 'Sync', spec: ref(inbox) });
      const { feature: compose } = yield* create.handler({ name: 'Compose', spec: ref(inbox) });
      yield* create.handler({ name: 'Gmail', parent: ref(sync) });
      yield* deleteFeature.handler({ feature: ref(sync) });
      expect(featureIds(inbox)).toEqual([compose.id]);
      const remaining = yield* Database.query(Filter.type(Feature.Feature)).run;
      expect(remaining.map(({ name }) => name)).toEqual(['Compose']);
      expect((yield* Database.query(Filter.type(Spec.Spec)).run).map(({ id }) => id)).toEqual([inbox.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('FeatureOperation.GetFeatures', () => {
  it.effect('reads each member with its dependencies, tasks, showcases and subfeatures', () =>
    Effect.gen(function* () {
      const inbox = yield* addSpec('Inbox');
      const { feature: compose } = yield* create.handler({
        name: 'Compose',
        requirements: [{ text: 'Replies thread under the original.' }],
        spec: ref(inbox),
      });
      const { feature: drafts } = yield* create.handler({ name: 'Drafts', parent: ref(compose) });
      const { feature: sync } = yield* create.handler({ name: 'Sync', status: 'prototype', spec: ref(inbox) });
      yield* create.handler({ name: 'Elsewhere', spec: ref(yield* addSpec('Other')) });
      const task = yield* Database.add(Task.make({ title: 'Send through Gmail', status: 'started' }));
      yield* addDependency.handler({ feature: ref(compose), dependsOn: ref(sync) });
      yield* linkTask.handler({ task: ref(task), feature: ref(compose) });
      // Any object can be the source; plugin-presenter's handler makes a deck, covered by its own tests.
      const showcase = yield* Database.add(Markdown.make({ name: 'Sending a reply' }));
      yield* Database.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: compose }));

      yield* Database.flush();

      const result = yield* getFeatures.handler({ spec: ref(inbox) });
      expect(result.features.map(({ name }) => name)).toEqual(['Compose', 'Drafts', 'Sync']);
      expect(result.features[0]).toMatchObject({ spec: inbox.id, breakdown: compose.spec?.target?.id });
      expect(result.features[1]).toMatchObject({ id: drafts.id, parent: compose.id, spec: compose.spec?.target?.id });
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
      const { feature } = yield* create.handler({
        name: 'Code mode',
        key: 'network.dxos.team.features.mcp.codeMode',
        spec: ref(yield* addSpec()),
      });
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
      const spec = ref(yield* addSpec());
      const { feature: codeMode } = yield* create.handler({
        name: 'Code mode',
        key: 'network.dxos.team.features.mcp.codeMode',
        spec,
      });
      const { feature: sandbox } = yield* create.handler({
        name: 'Sandbox',
        key: 'org.example.features.sandbox',
        spec,
      });
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
