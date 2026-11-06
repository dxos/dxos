//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { projectFunctionToTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { PlainDialect } from './dialect-plain.ts';
import type { SandboxOperation } from './Dialect.ts';
import { REFERENCE_FORMAT, REFERENCE_NOTE, compactReferences } from './references.ts';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

const Assign = Operation.make({
  meta: { key: DXN.make('com.example.operation.assign'), name: 'Assign', description: 'Assigns a task.' },
  input: Schema.Struct({
    owner: Ref.Ref(Person).annotate({ description: 'Who takes the task.' }),
    watchers: Schema.optional(Schema.Array(Ref.Ref(Person))),
    note: Schema.String.annotate({ description: 'Why it is assigned.' }),
  }),
  output: Schema.Void,
});

/** The operation as code mode sees it: its tool projection's JSON schema, which is what the tool path validates. */
const sandboxOperation = (definition: Operation.Definition.Any): SandboxOperation => {
  const tool = projectFunctionToTool(definition);
  return {
    name: tool.name,
    description: tool.description,
    parameters: Tool.getJsonSchema(tool),
    definition,
    invoke: () => Effect.void,
  };
};

/** Occurrences of the format's first line, which no field keeps once it is stated once. */
const formatCount = (text: string): number => text.split(REFERENCE_FORMAT.split('\n')[0]).length - 1;

describe('references', () => {
  test('the tool projection writes the reference format into every reference field', ({ expect }) => {
    expect(formatCount(JSON.stringify(sandboxOperation(Assign).parameters))).toBe(2);
  });

  test('a reference field keeps its own description and says it is a reference', ({ expect }) => {
    const schema = compactReferences(sandboxOperation(Assign));
    expect(schema).toMatchObject({
      properties: {
        owner: { type: 'string', description: `Who takes the task. ${REFERENCE_NOTE}` },
        watchers: { items: { type: 'string', description: REFERENCE_NOTE } },
        note: { type: 'string', description: 'Why it is assigned.' },
      },
    });
    expect(formatCount(JSON.stringify(schema))).toBe(0);
    expect(JSON.stringify(schema)).not.toContain('examples');
  });

  test('the plain dialect states the format once for all operations', ({ expect }) => {
    const prompt = PlainDialect.instructions({
      operations: [sandboxOperation(Assign), { ...sandboxOperation(Assign), name: 'assign-again' }],
      types: [],
    });
    expect(formatCount(prompt)).toBe(1);
    expect(prompt).toContain('#### References');
  });

  test('an operation with no reference field leaves the format out', ({ expect }) => {
    const Note = Operation.make({
      meta: { key: DXN.make('com.example.operation.note'), name: 'Note', description: 'Writes a note.' },
      input: Schema.Struct({ text: Schema.String }),
      output: Schema.Void,
    });
    const prompt = PlainDialect.instructions({ operations: [sandboxOperation(Note)], types: [] });
    expect(formatCount(prompt)).toBe(0);
    expect(prompt).not.toContain('#### References');
  });
});
