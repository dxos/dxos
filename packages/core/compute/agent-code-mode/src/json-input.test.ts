//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { ARTIFACT_URI_DESCRIPTION } from '@dxos/assistant';

import { PlainDialect } from './dialect-plain.ts';
import { REF_LABEL, renderJsonInput } from './json-input.ts';

/** A reference field as a tool's JSON Schema projects one. */
const REF = { type: 'string', description: ARTIFACT_URI_DESCRIPTION, examples: ['echo://01KG7R1ZXWFMWQ4DA1Q6TN1DG4'] };

describe('renderJsonInput', () => {
  test('fields read as a TypeScript-like label, each description kept as a comment', ({ expect }) => {
    expect(
      renderJsonInput({
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to match.' },
          limit: { type: 'integer' },
          force: { type: 'string', enum: ['assertive', 'directive'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['query'],
        additionalProperties: false,
      }),
    ).toEqual(
      '{ query: string /* Words to match. */, limit?: number, force?: "assertive" | "directive", tags?: string[] }',
    );
  });

  test('a reference field reads as Ref, without the formats every reference repeats', ({ expect }) => {
    const label = renderJsonInput({
      type: 'object',
      properties: {
        agent: REF,
        target: {
          description: 'Where to file it.',
          anyOf: [
            { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: true },
            REF,
          ],
        },
        files: { type: 'array', items: REF },
      },
      required: ['agent'],
    });
    expect(label).toEqual(
      `{ agent: ${REF_LABEL}, target?: { id: string, … } | ${REF_LABEL} /* Where to file it. */, files?: ${REF_LABEL}[] }`,
    );
    expect(label).not.toContain('Protocols accepted');
  });

  test('a reference keeps its own description, which the tool projection puts before the formats', ({ expect }) => {
    expect(
      renderJsonInput({
        type: 'object',
        properties: {
          subject: { ...REF, description: `The entity to recall; all if omitted.\n${ARTIFACT_URI_DESCRIPTION}` },
        },
      }),
    ).toEqual(`{ subject?: ${REF_LABEL} /* The entity to recall; all if omitted. */ }`);
  });

  test('an input with no fields, a union of arrays and a key that is not an identifier', ({ expect }) => {
    expect(renderJsonInput({ type: 'object', properties: {} })).toEqual('{}');
    expect(
      renderJsonInput({
        type: 'object',
        properties: {
          '@type': { type: 'string' },
          'values': { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
          'note': { type: ['string', 'null'] },
        },
        required: ['@type'],
      }),
    ).toEqual('{ "@type": string, values?: (string | number)[], note?: string | null }');
  });

  test('a comment cannot end early on a description that holds its terminator', ({ expect }) => {
    expect(
      renderJsonInput({ type: 'object', properties: { glob: { type: 'string', description: 'e.g. src/**/*.ts' } } }),
    ).toEqual('{ glob?: string /* e.g. src/** /*.ts */ }');
  });
});

describe('plain dialect operations', () => {
  test('state the reference formats once, not with every reference field', ({ expect }) => {
    const operation = {
      description: 'Links two objects.',
      parameters: { type: 'object', properties: { source: REF, target: REF }, required: ['source', 'target'] },
      invoke: () => Effect.succeed(undefined),
    };
    const instructions = PlainDialect.instructions({
      operations: [
        { ...operation, name: 'space-link' },
        { ...operation, name: 'space-unlink' },
      ],
    });
    expect(instructions).toContain(
      '- `await ops["space-link"](input)` — Links two objects.\n  input: { source: Ref, target: Ref }',
    );
    expect(instructions).toContain('A `Ref` field takes `ref(obj)`');
    expect(instructions).not.toContain('Protocols accepted');
  });
});
