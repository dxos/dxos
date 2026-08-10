import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Ast from '../src/ast';
import { readStoredSchema, writeStoredSchema } from '../src/dispatch';

// Every ECHO type exported by @dxos/types, emitted by `toJsonSchema` on effect 3.21.4.
const corpus = JSON.parse(
  readFileSync(fileURLToPath(new URL('../corpus-v3.json', import.meta.url)), 'utf-8'),
) as Record<string, any>;

const typenames = Object.keys(corpus);

test('the corpus is the real production type set', () => {
  expect(typenames.length).toBeGreaterThanOrEqual(18);
  expect(typenames).toContain('org.dxos.type.person');
});

describe.each(typenames)('%s', (typename) => {
  const document = corpus[typename];

  test('decodes into a v4 schema', () => {
    const schema = readStoredSchema(document);
    expect(schema.ast._tag).toBe('Objects');
  });

  test('preserves the declared property set and optionality', () => {
    const props = Ast.getProperties(readStoredSchema(document).ast);
    const declared = Object.keys(document.properties ?? {});
    expect(props.map((p) => String(p.name)).sort()).toEqual(declared.sort());

    const required: string[] = document.required ?? [];
    for (const prop of props) {
      expect(prop.isOptional, `${typename}.${String(prop.name)}`).toBe(!required.includes(String(prop.name)));
    }
  });

  test('preserves type identity', () => {
    const annotations = readStoredSchema(document).ast.annotations!;
    expect((annotations['@dxos/echo/Type'] as any)?.typename).toBe(typename);
  });

  test('survives a v3 -> v4 rewrite unchanged', () => {
    const fromV3 = readStoredSchema(document);
    const rewritten = readStoredSchema(writeStoredSchema(fromV3));

    const shape = (schema: Schema.Top) =>
      Ast.getProperties(schema.ast).map((p) => [String(p.name), p.isOptional, p.type._tag]);
    expect(shape(rewritten)).toEqual(shape(fromV3));
  });
});
