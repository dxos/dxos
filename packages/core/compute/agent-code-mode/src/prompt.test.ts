//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Ref, Type } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { renderTypes } from './Dialect.ts';
import { STATIC_DOCS, loadDocs } from './docs/index.ts';
import { conciseError } from './eval-tool.ts';
import { describeFields, describeInput, describeTypes } from './fields.ts';

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
      { name: 'title', type: 'string', summary: 'string', optional: false },
      { name: 'status', type: '"open" | "done"', summary: '"open" | "done"', optional: false },
      { name: 'priority', type: 'number', summary: 'number', optional: true },
      {
        name: 'owner',
        type: 'Ref<com.example.type.person>',
        summary: 'Ref<com.example.type.person>',
        optional: true,
      },
      { name: 'tags', type: 'string[]', summary: 'string[]', optional: false },
    ]);
  });

  test('a summary collapses nested structs; a named schema is labelled by its name', ({ expect }) => {
    const Named = Schema.Struct({ type: Schema.String }).annotate({ identifier: 'jsonSchema' });
    const [steps, schema] = describeFields({
      steps: Schema.Array(Schema.Struct({ text: Schema.String, done: Schema.Boolean })),
      schema: Schema.optional(Named),
    });
    expect(steps).toMatchObject({ type: '{ text: string, done: boolean }[]', summary: 'object[]' });
    expect(schema).toMatchObject({ type: 'jsonSchema', summary: 'jsonSchema', optional: true });
  });

  test('only the first type at the newest version of a typename is latest', ({ expect }) => {
    const TaskNext = Type.makeObject(DXN.make('com.example.type.task', '0.10.0'))(
      Schema.Struct({ title: Schema.String }),
    );
    const registry = makeRegistry({ initial: [TaskNext, Task, Person] });
    expect(describeTypes(registry).map(({ dxn, latest }) => ({ dxn, latest }))).toEqual(
      expect.arrayContaining([
        { dxn: 'dxn:com.example.type.task:0.10.0', latest: true },
        { dxn: 'dxn:com.example.type.task:0.1.0', latest: false },
        { dxn: 'dxn:com.example.type.person:0.1.0', latest: true },
      ]),
    );
  });

  test('the types section renders each field with its type', ({ expect }) => {
    const rendered = renderTypes([
      {
        typename: 'com.example.type.task',
        dxn: 'dxn:com.example.type.task:0.1.0',
        kind: 'object',
        latest: true,
        fields: describeFields(Task.fields),
      },
    ]);
    expect(rendered).toContain(
      '- `com.example.type.task` — title: string, status: "open" | "done", priority?: number, ' +
        'owner?: Ref<com.example.type.person>, tags: string[]',
    );
  });

  test('the effect prompt lists the newest version of each type and points at the catalog', ({ expect }) => {
    const fields = describeFields({ title: Schema.String, meta: Schema.Struct({ note: Schema.String }) });
    const type = (version: string, latest: boolean) => ({
      typename: 'com.example.type.note',
      dxn: `dxn:com.example.type.note:${version}`,
      kind: 'object' as const,
      latest,
      fields,
    });
    const instructions = EffectDialect.instructions({
      types: [type('0.1.0', false), type('0.2.0', true)],
      operations: [],
    });
    expect(instructions).toContain('- `dxn:com.example.type.note:0.2.0` — title: string, meta: object');
    expect(instructions).not.toContain('com.example.type.note:0.1.0');
    expect(instructions).toContain("`DOCS['catalog/types.md']`");
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
    // `Operation.make` does not require a struct, so any other input is labelled as it is.
    expect(describeInput(Schema.String)).toEqual('string');
    expect(describeInput(Schema.suspend(() => Schema.Struct({ id: Schema.String })))).toEqual('{ id: string }');
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
    expect(instructions).toContain("yield* Database.resolve('dxn:com.example.operation.close')");
    expect(instructions).toContain('`catalog/operations.md`');
  });

  test('the effect prompt cuts a long operation description at a sentence end', ({ expect }) => {
    const description = 'Closes a task. '.repeat(100).trim();
    const Close = Operation.make({
      meta: { key: DXN.make('com.example.operation.close'), name: 'Close', description },
      input: Schema.Struct({ task: Ref.Ref(Task) }),
      output: Schema.Void,
    });
    const instructions = EffectDialect.instructions({
      types: [],
      operations: [{ name: 'close', description, parameters: {}, definition: Close, invoke: () => Effect.void }],
    });
    expect(instructions).toContain("Closes a task. … [cut; `DOCS['catalog/operations.md']` has the full text]");
    expect(instructions).not.toContain(description);
  });

  test('the prompt and the README list every doc', async ({ expect }) => {
    const DOCS = await EffectEx.runPromise(loadDocs);
    const instructions = EffectDialect.instructions({ types: [], operations: [] });
    expect(Object.keys(DOCS)).toEqual(STATIC_DOCS.map(({ name }) => name));
    for (const name of [...Object.keys(DOCS), 'catalog/types.md', 'catalog/operations.md']) {
      expect(DOCS['README.md']).toContain(`\`${name}\``);
      expect(instructions).toContain(`- \`${name}\` — `);
    }
    expect(DOCS['queries.md']).toContain('Filter.id(id)');
    // A formatter reading a snippet as top-level code turns `yield*` into multiplication.
    for (const [name, text] of Object.entries(DOCS)) {
      expect(text.includes('yield * '), name).toBe(false);
    }
    // Models guessed `result.value`; the field is `success`.
    expect(DOCS['errors.md']).toContain("{ _tag: 'Success', success }");
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
