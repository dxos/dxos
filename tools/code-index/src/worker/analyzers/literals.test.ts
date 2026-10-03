//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { analyzeTypeScript } from './typescript.ts';

const SOURCE = `import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const KEY = 'org.dxos.operation.computed';

export const Create = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.markdown.create'), name: \`Create\`, icon: 'ph--plus' },
  input: Schema.Struct({ name: Schema.String }),
  services: [Database.Service],
});

export const Piped = Operation.make({ meta: { key: 'org.dxos.operation.piped' } }).pipe(Operation.withHandler(run));

export const Computed = Operation.make({ meta: { key: DXN.make(KEY), name: \`\${KEY}.name\` }, [KEY]: 'skipped' });

export const Typed = make({ id: 'typed' } as const satisfies Options);

export const Plain = { key: 'not-a-call' };
`;

const document = analyzeTypeScript({
  root: '/repo',
  path: 'src/Create.ts',
  source: SOURCE,
  mtime: 1,
  resolve: () => undefined,
  packageOf: () => undefined,
});

const literalsOf = (name: string) => document.declares.find((symbol) => symbol.name === name)?.literal;

describe('deus:literal', () => {
  test('nested string properties of the constructing call, a one-string call read as its string', () => {
    expect(literalsOf('Create')).toEqual([
      'meta.key=org.dxos.operation.markdown.create',
      'meta.name=Create',
      'meta.icon=ph--plus',
    ]);
  });

  test('`.pipe(...)` stages and type assertions are looked through', () => {
    expect(literalsOf('Piped')).toEqual(['meta.key=org.dxos.operation.piped']);
    expect(literalsOf('Typed')).toEqual(['id=typed']);
  });

  test('identifiers, substitutions and computed keys are not evaluated', () => {
    expect(literalsOf('Computed')).toBeUndefined();
    expect(literalsOf('Plain')).toBeUndefined();
    expect(literalsOf('KEY')).toBeUndefined();
  });
});
