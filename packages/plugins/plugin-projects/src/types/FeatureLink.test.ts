//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, Obj } from '@dxos/echo';

import * as Feature from './Feature.ts';
import * as FeatureLink from './FeatureLink.ts';

// Interpolated so a scan of this repository does not read the fixtures below as tags.
const TAG = '@' + 'feature';
const CODE_MODE = 'dxn:network.dxos.team.features.mcp.codeMode#ABC123';

describe('FeatureLink.scan', () => {
  test('finds tags on suites, tests and declarations, with their lines', ({ expect }) => {
    const text = [
      `/**`,
      ` * ${TAG} ${CODE_MODE}`,
      ` */`,
      `describe('code mode', () => {`,
      `  /** ${TAG} dxn:org.example.features.sandbox#ZZZ999 */`,
      `  test.skip("runs a script", () => {});`,
      `});`,
      ``,
      `/**`,
      ` * Sends the event.`,
      ` * ${TAG} ${CODE_MODE}`,
      ` * ${TAG} dxn:org.example.features.sandbox#ZZZ999`,
      ` */`,
      `export const trackRun = () => {};`,
    ].join('\n');
    const { links, errors } = FeatureLink.scan('src/code-mode.test.ts', text);
    expect(errors).toEqual([]);
    expect(links).toEqual([
      { dxn: CODE_MODE, path: 'src/code-mode.test.ts', line: 2, kind: 'suite', symbol: 'code mode' },
      {
        dxn: 'dxn:org.example.features.sandbox#ZZZ999',
        path: 'src/code-mode.test.ts',
        line: 5,
        kind: 'test',
        symbol: 'runs a script',
      },
      { dxn: CODE_MODE, path: 'src/code-mode.test.ts', line: 11, kind: 'code', symbol: 'trackRun' },
      {
        dxn: 'dxn:org.example.features.sandbox#ZZZ999',
        path: 'src/code-mode.test.ts',
        line: 12,
        kind: 'code',
        symbol: 'trackRun',
      },
    ]);
  });

  test('reports a value that is not a DXN or has no mnemonic', ({ expect }) => {
    const text = [
      `/** ${TAG} code-mode */`,
      `test('a', () => {});`,
      `/** ${TAG} dxn:org.example.features.sandbox */`,
      `test('b', () => {});`,
      `/** ${TAG} */`,
      `test('c', () => {});`,
    ].join('\n');
    const { links, errors } = FeatureLink.scan('a.test.ts', text);
    expect(links).toEqual([]);
    expect(errors.map(({ line, message }) => [line, message])).toEqual([
      [1, 'not a DXN'],
      [3, 'no #mnemonic'],
      [5, 'not a DXN'],
    ]);
  });

  test('ignores the tag outside JSDoc comments and inside prose', ({ expect }) => {
    const text = [
      `// ${TAG} ${CODE_MODE}`,
      `const tag = '${TAG} ${CODE_MODE}';`,
      `/** Cite it with a \`${TAG}\` tag, e.g. ${TAG} ${CODE_MODE}. */`,
    ].join('\n');
    expect(FeatureLink.scan('a.ts', text).links).toEqual([]);
  });
});

describe('FeatureLink.resolve', () => {
  const make = (key: string) => {
    const feature = Feature.make({ name: key, status: 'planned' });
    Obj.update(feature, (feature) => {
      Obj.getMeta(feature).key = key;
    });
    return feature;
  };
  const link = (feature: Feature.Feature, key = Obj.getMeta(feature).key) => {
    const dxn = DXN.tryMake(`dxn:${key}#${Obj.getMnemonic(feature)}`);
    if (!dxn) {
      throw new Error('Invalid DXN.');
    }
    return dxn;
  };

  test('the mnemonic picks among features with the key', ({ expect }) => {
    const first = make('org.example.features.sync');
    const second = make('org.example.features.sync');
    expect(FeatureLink.resolve(link(second), { byKey: [first, second], byMnemonic: [second] })).toEqual({
      status: 'exact',
      feature: second,
    });
  });

  test('the mnemonic alone resolves a link whose key changed', ({ expect }) => {
    const feature = make('org.example.features.renamed');
    const dxn = link(feature, 'org.example.features.original');
    expect(FeatureLink.resolve(dxn, { byKey: [], byMnemonic: [feature] })).toEqual({ status: 'renamed', feature });
  });

  test('the key alone resolves when no feature has the mnemonic, unless several have the key', ({ expect }) => {
    const first = make('org.example.features.sync');
    const second = make('org.example.features.sync');
    const dxn = DXN.withMnemonic(link(first), 'ZZZZZZ');
    expect(FeatureLink.resolve(dxn, { byKey: [first], byMnemonic: [] })).toEqual({ status: 'stale', feature: first });
    expect(FeatureLink.resolve(dxn, { byKey: [first, second], byMnemonic: [] })).toEqual({ status: 'ambiguous' });
    expect(FeatureLink.resolve(dxn, { byKey: [], byMnemonic: [] })).toEqual({ status: 'missing' });
  });
});

describe('Feature.getLink', () => {
  test('is the meta.key with the mnemonic, or undefined without a key', ({ expect }) => {
    const feature = Feature.make({ name: 'Code mode', status: 'planned' });
    expect(Feature.getLink(feature)).toBeUndefined();
    Obj.update(feature, (feature) => {
      Obj.getMeta(feature).key = 'network.dxos.team.features.mcp.codeMode';
    });
    expect(Feature.getLink(feature)).toBe(`dxn:network.dxos.team.features.mcp.codeMode#${Obj.getMnemonic(feature)}`);
  });
});

describe('Feature.getCodeUrl', () => {
  test('opens the file at its line, encoding each path segment', ({ expect }) => {
    expect(Feature.getCodeUrl({ path: 'src/a.test.ts', line: 3 })).toBe(
      'https://github.com/dxos/dxos/blob/main/src/a.test.ts#L3',
    );
    expect(Feature.getCodeUrl({ path: '/src/a#b?.ts', line: 1 })).toBe(
      'https://github.com/dxos/dxos/blob/main/src/a%23b%3F.ts#L1',
    );
  });
});
