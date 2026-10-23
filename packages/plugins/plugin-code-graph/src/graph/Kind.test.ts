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
    expect(sparql).toContain('GROUP BY ?s');
    expect(Kind.query([])).toBeUndefined();

    const pkg = `${Iri.PACKAGE}@dxos/plugin-code`;
    const dir = 'packages/plugins/plugin-code';
    const rows: Record<string, string>[] = [
      {
        s: symbol,
        types: `${Iri.DEUS}Symbol ${Iri.DEUS}Capability`,
        kind: 'variable',
        dir,
        pkg: '@dxos/plugin-code',
      },
      { s: file, types: `${Iri.DEUS}File`, dir, pkg: '@dxos/plugin-code' },
      { s: pkg, types: `${Iri.DEUS}Package`, dir, pkg: '@dxos/plugin-code' },
    ];
    const info = Kind.fromRows(
      [
        { id: symbol, kind: 'symbol' },
        { id: file, kind: 'file' },
        { id: pkg, kind: 'package' },
      ],
      rows,
    );
    expect(info.kinds).toEqual({ [symbol]: 'capability', [file]: 'file', [pkg]: 'package' });
    // The package box lands in its own package's group, beside its files.
    expect(info.groups).toEqual({ [symbol]: dir, [file]: dir, [pkg]: dir });
    expect(info.packages).toEqual({ [dir]: '@dxos/plugin-code' });
  });

  test('gives related kinds one hue and unknown kinds none', ({ expect }) => {
    expect(Kind.hueOf('capability')).toBe('indigo');
    expect(Kind.hueOf('layer')).toBe(Kind.hueOf('layer factory'));
    expect(Kind.hueOf('file')).toBe('neutral');
    expect(Kind.hueOf('something new')).toBe('neutral');
  });
});
