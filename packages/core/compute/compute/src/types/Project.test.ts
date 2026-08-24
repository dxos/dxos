//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Ref, Type, URI } from '@dxos/echo';
import { Outline, TaskSet } from '@dxos/types';

import * as Instructions from './Instructions';
import * as Project from './Project';
import * as Routine from './Routine';

// Stand-in `Obj.Unknown` type for context objects, mirroring the ad-hoc test types used in
// `AiContext.test.ts` — no database needed since `Ref.make` inlines the target.
const TestObject = Type.makeObject(DXN.make('org.dxos.type.testObject', '0.1.0'))(Schema.Struct({}));

describe('Project', () => {
  test('typename, version, and defaults', ({ expect }) => {
    expect(Type.getTypename(Project.Project)).toBe('org.dxos.type.project');
    expect(Type.getVersion(Project.Project)).toBe('0.5.0');
    const project = Project.make({ name: 'test' });
    expect(Obj.instanceOf(Project.Project, project)).toBe(true);
    expect(project.artifacts).toEqual([]);
    expect(project.routines).toEqual([]);
  });

  test('the v0.4.0 migration carries a project forward with an empty routines array', async ({ expect }) => {
    const [migration] = Project.migrations;
    expect(migration.fromType).toContain('0.4.0');
    expect(migration.toType).toContain('0.5.0');

    const legacy = Obj.make(Project.Project_v0_4_0, { name: 'Legacy', artifacts: [] });
    const migrated: any = await migration.transform(legacy, {} as any);
    expect(migrated.name).toBe('Legacy');
    expect(migrated.routines).toEqual([]);
  });

  test('addRoutine links a routine by ref and parents it for cascade', ({ expect }) => {
    const project = Project.make({ name: 'test' });
    const routine = Routine.make({ name: 'Starter', triggers: [] });
    Project.addRoutine(project, routine);
    expect(project.routines.map((ref) => ref.target?.id)).toEqual([routine.id]);
    expect(Obj.getParent(routine)?.id).toBe(project.id);
  });

  test('a project owns a task set from the start, parented for cascade', ({ expect }) => {
    const project = Project.make({ name: 'test' });
    const taskSet = project.taskSet?.target;
    expect(taskSet).toBeDefined();
    expect(TaskSet.instanceOf(taskSet)).toBe(true);
    expect(Obj.getParent(taskSet!)?.id).toBe(project.id);
  });

  test('a project owns an outline from the start, parented for cascade', ({ expect }) => {
    const project = Project.make({ name: 'test' });
    const outline = project.outline?.target;
    expect(outline).toBeDefined();
    expect(Obj.instanceOf(Outline.Outline, outline!)).toBe(true);
    expect(Obj.getParent(outline!)?.id).toBe(project.id);
    // The outline's text is its own object; it cascades through the outline, not the project.
    expect(Obj.getParent(outline!.content.target!)?.id).toBe(outline!.id);
  });

  test('an explicitly supplied outline is kept', ({ expect }) => {
    const existing = Outline.make({ name: 'Adopted' });
    const project = Project.make({ name: 'test', outline: Ref.make(existing) });
    expect(project.outline?.target?.id).toBe(existing.id);
  });

  test('an explicitly supplied task set is kept', ({ expect }) => {
    const existing = TaskSet.make({ name: 'Mirrored' });
    const project = Project.make({ name: 'test', taskSet: Ref.make(existing) });
    expect(project.taskSet?.target?.id).toBe(existing.id);
  });

  test('contextBindings exposes skills and objects, not the instructions object itself', ({ expect }) => {
    const skillRef = Ref.fromURI(URI.make('dxn:echo:@:skill-1'));
    const doc = Obj.make(TestObject, {});
    const instructions = Instructions.make({ text: 'Test', skills: [skillRef], objects: [Ref.make(doc)] });
    const project = Project.make({ name: 'test' });
    Obj.update(project, (project) => {
      project.instructions = Ref.make(instructions);
    });
    Obj.setParent(instructions, project);

    const bindings = Project.contextBindings(project);
    expect(bindings.skills.map((ref) => ref.uri)).toEqual([skillRef.uri]);
    // Instructions text reaches the prompt via Chat.instructions, not a binding.
    expect(bindings.objects.map((ref) => ref.uri)).toEqual([Ref.make(doc).uri]);
  });

  test('contextBindings returns empty bindings when instructions is unresolved', ({ expect }) => {
    const project = Project.make({ name: 'test' });
    Obj.update(project, (project) => {
      project.instructions = Ref.fromURI(URI.make('dxn:echo:@:instructions-1'));
    });

    const bindings = Project.contextBindings(project);
    expect(bindings.skills).toEqual([]);
    expect(bindings.objects).toEqual([]);
  });
});
