//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Ref, Type, URI } from '@dxos/echo';

import * as Instructions from './Instructions';
import * as Project from './Project';

// Stand-in `Obj.Unknown` type for context objects, mirroring the ad-hoc test types used in
// `AiContext.test.ts` — no database needed since `Ref.make` inlines the target.
const TestObject = Type.makeObject(DXN.make('org.dxos.type.testObject', '0.1.0'))(Schema.Struct({}));

describe('Project', () => {
  test('typename, version, and defaults', ({ expect }) => {
    expect(Type.getTypename(Project.Project)).toBe('org.dxos.type.project');
    expect(Type.getVersion(Project.Project)).toBe('0.2.0');
    const project = Project.make({ name: 'test' });
    expect(Obj.instanceOf(Project.Project, project)).toBe(true);
    expect(project.routines).toEqual([]);
  });

  test('contextBindings exposes instructions, skills, and objects', ({ expect }) => {
    const skillRef = Ref.fromURI(URI.make('dxn:echo:@:skill-1'));
    const doc = Obj.make(TestObject, {});
    const instructions = Instructions.make({ text: 'Test', skills: [skillRef], objects: [Ref.make(doc)] });
    const project = Project.make({ name: 'test' });
    Obj.setParent(instructions, project);
    Obj.update(project, (project) => {
      project.instructions = Ref.make(instructions);
    });

    const bindings = Project.contextBindings(project);
    expect(bindings.skills.map((ref) => ref.uri)).toEqual([skillRef.uri]);
    expect(bindings.objects.length).toBe(2);
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
