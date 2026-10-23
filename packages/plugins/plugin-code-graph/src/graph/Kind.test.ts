//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Iri from './Iri.ts';
import * as Kind from './Kind.ts';

const symbol = `${Iri.FILE}packages/plugins/plugin-code/src/types/CodeCapabilities.ts#SpecSync`;
const file = `${Iri.FILE}packages/plugins/plugin-code/src/types/CodeCapabilities.ts`;

describe('Kind', () => {
  test('names the most specific class a rule concluded', ({ expect }) => {
    expect(
      Kind.describe({ types: [`${Iri.DEUS}Symbol`, `${Iri.DEUS}Capability`], kind: 'variable', coarse: 'symbol' }),
    ).toBe('capability');
    expect(
      Kind.describe({ types: ['deus:PluginModule', 'deus:OperationHandler', 'deus:Symbol'], coarse: 'symbol' }),
    ).toBe('operation handler');
    expect(Kind.describe({ types: ['deus:EffectService'], coarse: 'symbol' })).toBe('service');
  });

  test('falls back to a class the table does not name, then the declaration kind, then the coarse kind', ({
    expect,
  }) => {
    expect(Kind.describe({ types: ['deus:Symbol', 'deus:SomeNewThing'], coarse: 'symbol' })).toBe('some new thing');
    expect(Kind.describe({ types: ['deus:Symbol'], kind: 'function', coarse: 'symbol' })).toBe('function');
    expect(Kind.describe({ types: ['deus:Symbol'], kind: 'unknown', coarse: 'symbol' })).toBe('symbol');
    expect(Kind.describe({ types: [`${Iri.DEUS}File`], coarse: 'file' })).toBe('file');
  });

  test('titles a symbol by its own name, whatever its label', ({ expect }) => {
    expect(Kind.titleOf({ id: symbol, kind: 'symbol', label: 'CodeCapabilities.ts#SpecSync' })).toBe('SpecSync');
    expect(Kind.titleOf({ id: file, kind: 'file', label: 'src/types/CodeCapabilities.ts' })).toBe(
      'src/types/CodeCapabilities.ts',
    );
  });

  test('queries every resource at once and folds the rows per resource', ({ expect }) => {
    const sparql = Kind.query([symbol, file, symbol, 'not an iri', 'https://x/a b']);
    expect(sparql).toContain(`VALUES ?s { <${symbol}> <${file}> }`);
    expect(Kind.query([])).toBeUndefined();

    const rows: Record<string, string>[] = [
      { s: symbol, type: `${Iri.DEUS}Symbol`, kind: 'variable' },
      { s: symbol, type: `${Iri.DEUS}Capability`, kind: 'variable' },
      { s: file, type: `${Iri.DEUS}File` },
    ];
    expect(
      Kind.fromRows(
        [
          { id: symbol, kind: 'symbol' },
          { id: file, kind: 'file' },
          { id: `${Iri.PACKAGE}@dxos/echo`, kind: 'package' },
        ],
        rows,
      ),
    ).toEqual({ [symbol]: 'capability', [file]: 'file', [`${Iri.PACKAGE}@dxos/echo`]: 'package' });
  });
});
