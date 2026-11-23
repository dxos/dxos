//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj } from '@dxos/echo';

import * as Feature from './Feature.ts';

//
// Scan
//

/** One `@feature` tag found in the repository: the feature it cites and where. */
export const Link = Schema.Struct({
  dxn: Schema.String.annotate({ description: 'The DXN in the tag, e.g. dxn:org.example.features.sync#ABC123.' }),
  ...Feature.CodeLink.fields,
});
export type Link = Schema.Schema.Type<typeof Link>;

/** A `@feature` tag whose value cannot name a feature. */
export type ScanError = { path: string; line: number; value: string; message: string };

export type ScanResult = { links: Link[]; errors: ScanError[] };

const JSDOC = /\/\*\*[\s\S]*?\*\//g;
// A block tag opens a JSDoc line (after `/**` or a leading `*`); mid-sentence mentions are prose.
const TAG = /(?:^|\/\*\*)[ \t]*\*?[ \t]*@feature(?![\w-])(?:[ \t]+(\S+))?/gm;
const SUITE = /^\s*(?:describe|suite)(?:\.\w+)*\s*\(\s*(['"`])(.*?)\1/;
const TEST = /^\s*(?:test|it)(?:\.\w+)*\s*\(\s*(['"`])(.*?)\1/;
const DECLARATION =
  /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

/** The symbol the code after a comment declares, and what kind of thing it is. */
const getSymbol = (code: string): Pick<Link, 'symbol' | 'kind'> => {
  const suite = SUITE.exec(code);
  if (suite) {
    return { kind: 'suite', symbol: suite[2] };
  }
  const test = TEST.exec(code);
  if (test) {
    return { kind: 'test', symbol: test[2] };
  }
  const declaration = DECLARATION.exec(code);
  return { kind: 'code', symbol: declaration?.[1] };
};

/** 1-based line of a character offset. */
const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

/**
 * Finds every `@feature <dxn>` JSDoc tag in a file. A tag documents the first line of code after its comment; a
 * value that is not a DXN, or that has no mnemonic to resolve it by, is an error rather than a link.
 */
export const scan = (path: string, text: string): ScanResult => {
  const links: Link[] = [];
  const errors: ScanError[] = [];
  for (const comment of text.matchAll(JSDOC)) {
    const start = comment.index;
    const end = start + comment[0].length;
    const next = text
      .slice(end)
      .split('\n')
      .find((line) => line.trim() !== '');
    const symbol = getSymbol(next ?? '');
    for (const tag of comment[0].matchAll(TAG)) {
      const line = lineAt(text, start + tag.index);
      const value = (tag[1] ?? '').replace(/\*\/$/, '');
      const dxn = DXN.tryMake(value);
      if (!dxn) {
        errors.push({ path, line, value, message: 'not a DXN' });
      } else if (!DXN.getMnemonic(dxn)) {
        errors.push({ path, line, value, message: 'no #mnemonic' });
      } else {
        links.push({ dxn, path, line, ...symbol });
      }
    }
  }
  return { links, errors };
};

//
// Resolve
//

/**
 * How a link found its feature: `exact` by key and mnemonic; `renamed` by mnemonic alone, the key having changed;
 * `stale` by key alone, the mnemonic matching no feature; `ambiguous` when several features have the key and none
 * the mnemonic; `missing` when nothing matched.
 */
export const Status = Schema.Literals(['exact', 'renamed', 'stale', 'ambiguous', 'missing']);
export type Status = Schema.Schema.Type<typeof Status>;

export type Resolution<T> =
  | { status: 'exact'; feature: T }
  | { status: 'renamed'; feature: T }
  | { status: 'stale'; feature: T }
  | { status: 'ambiguous' }
  | { status: 'missing' };

/**
 * Picks the feature a DXN names. `byKey` holds the candidates whose `meta.key` is the DXN's name and `byMnemonic`
 * those whose mnemonic is its suffix: the key leads, the mnemonic picks among features with that key, and the
 * mnemonic alone resolves a link whose key changed.
 */
export const resolve = <T extends Obj.Unknown>(
  dxn: DXN.DXN,
  { byKey, byMnemonic }: { byKey: readonly T[]; byMnemonic: readonly T[] },
): Resolution<T> => {
  const mnemonic = DXN.getMnemonic(dxn);
  const match = mnemonic && byKey.find((feature) => Obj.getMnemonic(feature) === mnemonic);
  if (match) {
    return { status: 'exact', feature: match };
  }
  if (byKey.length === 0) {
    if (byMnemonic.length === 0) {
      return { status: 'missing' };
    }
    return byMnemonic.length === 1 ? { status: 'renamed', feature: byMnemonic[0] } : { status: 'ambiguous' };
  }
  return byKey.length === 1 ? { status: 'stale', feature: byKey[0] } : { status: 'ambiguous' };
};
