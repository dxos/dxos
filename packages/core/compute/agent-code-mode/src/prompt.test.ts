//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { renderTypes } from './Dialect.ts';
import { conciseError } from './eval-tool.ts';
import { describeFields, describeInput } from './fields.ts';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.Literals(['open', 'done']),
    priority: Schema.optional(Schema.Number),
    owner: Schema.optional(Ref.Ref(Person)),
    tags: Schema.Array(Schema.String),
  }),
) {}

describe('prompt', () => {
  test('fields are described with their types, references included', ({ expect }) => {
    expect(describeFields(Task.fields)).toEqual([
      { name: 'title', type: 'string', optional: false },
      { name: 'status', type: '"open" | "done"', optional: false },
      { name: 'priority', type: 'number', optional: true },
      { name: 'owner', type: 'Ref<com.example.type.person>', optional: true },
      { name: 'tags', type: 'string[]', optional: false },
    ]);
  });

  test('the types section renders each field with its type', ({ expect }) => {
    const rendered = renderTypes([{ typename: 'com.example.type.task', fields: describeFields(Task.fields) }]);
    expect(rendered).toContain(
      '- `com.example.type.task` — title: string, status: "open" | "done", priority?: number, ' +
        'owner?: Ref<com.example.type.person>, tags: string[]',
    );
  });

  test('an operation input states refs as refs, not as the URI strings of the tool projection', ({ expect }) => {
    const input = Schema.Struct({
      task: Ref.Ref(Task),
      options: Schema.optional(Schema.Struct({ note: Schema.String, owners: Schema.Array(Ref.Ref(Person)) })),
    });
    expect(describeInput(input)).toEqual(
      '{ task: Ref<com.example.type.task>, options?: { note: string, owners: Ref<com.example.type.person>[] } }',
    );
    expect(describeInput(Schema.Struct({}))).toEqual('{}');
    expect(describeInput(Schema.Void)).toEqual('none');
  });

  test('the effect dialect documents an operation by the schema Operation.invoke decodes against', ({ expect }) => {
    const Close = Operation.make({
      meta: { key: DXN.make('com.example.operation.close'), name: 'Close', description: 'Closes a task.' },
      input: Schema.Struct({ task: Ref.Ref(Task) }),
      output: Schema.Void,
    });
    const instructions = EffectDialect.instructions({
      types: [],
      operations: [
        {
          name: 'close',
          description: 'Closes a task.',
          // What the tool projection states: a URI string, which `Operation.invoke` would reject.
          parameters: { type: 'object', properties: { task: { type: 'string' } } },
          definition: Close,
          invoke: () => Effect.void,
        },
      ],
    });
    expect(instructions).toContain('input: { task: Ref<com.example.type.task> }');
    expect(instructions).not.toContain('"type":"string"');
    expect(instructions).toContain('Filter.id(id)');
    // Models guessed `result.value`; the field is `success`.
    expect(instructions).toContain("{ _tag: 'Success', success }");
  });

  test('a failure keeps its head and drops serialized values', () => {
    const schemaDump = JSON.stringify({ ast: 'x'.repeat(5_000) });
    const error = conciseError(
      `InvalidDraftError: content: Missing key\ncaused by:\nError: content: Missing key\ncaused by:\nError: ${schemaDump}`,
    );
    expect(error.startsWith('InvalidDraftError: content: Missing key\ncaused by:')).toBe(true);
    expect(error).toContain('characters omitted]');
    expect(error.length).toBeLessThan(1_100);
  });

  test('a short failure is unchanged', () => {
    expect(conciseError('boom')).toEqual('boom');
  });
});
