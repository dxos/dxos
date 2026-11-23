//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { toObjectURI, toRefs } from './refs.ts';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
) {}

class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ text: Schema.String }),
) {}

const Input = Schema.Struct({ task: Ref.Ref(Task), tasks: Schema.Array(Ref.Ref(Task)), note: Schema.String });

const URI_OF_TASK = 'echo://BAHIPVPJFD7F34K4TWS4SPMTK2KQ2TEDX/01M82XEH98BVZ36GZVT2NPZS6K';

describe('toRefs', () => {
  // As the agent's context names the agent, and as code passes it where an operation takes `Ref<agent>`.
  test("an object's URI where a reference goes becomes that reference; other strings stay", ({ expect }) => {
    const value = toRefs(Input.ast, { task: URI_OF_TASK, tasks: [URI_OF_TASK], note: URI_OF_TASK });
    const field = (key: string): unknown =>
      typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
    const uriOf = (entry: unknown) => (Ref.isRef(entry) ? entry.uri : entry);
    expect(field('note')).toEqual(URI_OF_TASK);
    expect(uriOf(field('task'))).toEqual(URI_OF_TASK);
    expect(Ref.isRef(field('task'))).toBe(true);
    const tasks = field('tasks');
    expect(Array.isArray(tasks) && tasks.every((entry) => Ref.isRef(entry) && entry.uri === URI_OF_TASK)).toBe(true);
  });

  test('the forms models write for an object name its URI', ({ expect }) => {
    const id = '01M82XEH98BVZ36GZVT2NPZS6K';
    expect(toObjectURI(URI_OF_TASK)).toEqual(URI_OF_TASK);
    expect(toObjectURI(`dxn:${URI_OF_TASK}`)).toEqual(URI_OF_TASK);
    expect(toObjectURI(id)).toEqual(`echo:///${id}`);
    expect(toObjectURI(`echo://${id}`)).toEqual(`echo:///${id}`);
    expect(toObjectURI(`dxn:echo:@:${id}`)).toEqual(`echo:///${id}`);
    expect(toObjectURI('dxn:org.dxos.type.document:0.1.0')).toBeUndefined();
    expect(toObjectURI('a note')).toBeUndefined();
  });

  test('an object of the type a reference targets becomes that reference; one of another type throws', ({ expect }) => {
    const task = Obj.make(Task, { title: 'Draw' });
    const value = toRefs(Input.ast, { task, tasks: [], note: 'x' });
    const field = typeof value === 'object' && value !== null ? Reflect.get(value, 'task') : undefined;
    expect(Ref.isRef(field) && field.target).toBe(task);
    // As a drawing's canvas passed where the drawing goes: the operation would fail inside, far from the argument.
    const note = Obj.make(Note, { text: 'Draw' });
    expect(() => toRefs(Input.ast, { task: note, tasks: [], note: 'x' })).toThrow(
      'A Ref<com.example.type.task> goes here, and this object is a com.example.type.note.',
    );
    // A reference that takes any object takes it.
    expect(Ref.isRef(toRefs(Ref.Ref(Obj.Unknown).ast, note))).toBe(true);
  });

  test("an object's bare id where a reference goes names it in this space", ({ expect }) => {
    const value = toRefs(Input.ast, { task: '01M82XEH98BVZ36GZVT2NPZS6K', tasks: [], note: 'x' });
    const task = typeof value === 'object' && value !== null ? Reflect.get(value, 'task') : undefined;
    expect(Ref.isRef(task) && task.uri).toEqual('echo:///01M82XEH98BVZ36GZVT2NPZS6K');
  });
});
