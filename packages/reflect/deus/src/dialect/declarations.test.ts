//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { declarationsOf } from './declarations.ts';

const ext = (body: string) => `\`\`\`mdl\n${body}\n\`\`\`\n`;

const DIALECT = [
  ext(`ext type
  uri: org.dxos.mdl.type@1.0
  desc: A type.
  role: structure
  fields:
    fields?: FieldMap
    extends?: TypeRef[]
  links:
    extends: extends
    fields: composes`),
  ext(`ext op
  uri: org.dxos.mdl.op@1.0
  desc: An op.
  role: structure
  icon: ph--lightning--regular
  hue: orange
  links:
    input: depends-on`),
].join('\n');

describe('declarationsOf', () => {
  test('an ext gives its type a role and a relationship per linked field', ({ expect }) => {
    expect(declarationsOf([DIALECT]).get('type')).toEqual({
      role: 'structure',
      links: { extends: 'extends', fields: 'composes' },
    });
  });

  test("a spec's own ext keeps the dialect's role and overrides its links field by field", ({ expect }) => {
    const spec = ext(`ext type
  uri: org.dxos.mdl.type@1.0
  desc: A type with variants.
  fields:
    variants?: TypeRef[]
  links:
    fields: references
    variants: generalizes`);
    expect(declarationsOf([DIALECT, spec]).get('type')).toEqual({
      role: 'structure',
      links: { extends: 'extends', fields: 'references', variants: 'generalizes' },
    });
  });

  test("an ext that extends another starts from the parent's declaration", ({ expect }) => {
    const child = ext(`ext query
  uri: org.dxos.mdl.query@1.0
  extends: op
  desc: A read-only op.
  hue: cyan
  links:
    output: references`);
    expect(declarationsOf([DIALECT, child]).get('query')).toEqual({
      role: 'structure',
      links: { input: 'depends-on', output: 'references' },
      icon: 'ph--lightning--regular',
      hue: 'cyan',
    });
  });

  test('an ext takes its parent whichever text declares the parent, and in any order', ({ expect }) => {
    const child = ext(`ext query
  uri: org.dxos.mdl.query@1.0
  extends: op
  desc: A read-only op.`);
    expect(declarationsOf([child, DIALECT]).get('query')).toEqual(declarationsOf([DIALECT, child]).get('query'));
    expect(declarationsOf([child, DIALECT]).get('query')?.links).toEqual({ input: 'depends-on' });
  });

  test('an unknown role or relationship is ignored', ({ expect }) => {
    const odd = ext(`ext thing
  uri: org.dxos.mdl.thing@1.0
  desc: A thing.
  role: sidekick
  links:
    owner: befriends`);
    expect(declarationsOf([odd]).get('thing')).toEqual({ links: {} });
  });
});
