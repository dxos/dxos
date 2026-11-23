//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { toRefs } from './refs.ts';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
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
});
