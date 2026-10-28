//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from './check.ts';

/** A `<spec id>#<item>` reference, with the offsets of the whole reference text. */
export type SpecRef = { id: string; item: string; from: number; to: number };

/** A spec this one depends on, with the offsets of the id text. */
export type Dependency = { id: string; via: 'uses' | 'dependsOn'; from: number; to: number };

// The lookbehind rejects `github:org/repo/file.mdl#X` keys and URL fragments; the final `\w` drops a sentence period.
const REF = /(?<![\w/:.#-])([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)#([\w$.-]*\w)/g;

/**
 * Finds `<spec id>#<item>` references in prose and in `mdl` fences (comments included).
 * Every other fenced block is skipped, since it holds code rather than spec text.
 */
export const findSpecRefs = (text: string): SpecRef[] => {
  const refs: SpecRef[] = [];
  let fence: { scan: boolean } | undefined;
  let offset = 0;
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*```\s*([\w-]*)/);
    if (marker) {
      fence = fence ? undefined : { scan: marker[1] === 'mdl' };
    } else if (!fence || fence.scan) {
      for (const match of line.matchAll(REF)) {
        const from = offset + match.index;
        refs.push({ id: match[1], item: match[2], from, to: from + match[0].length });
      }
    }
    offset += line.length + 1;
  }
  return refs;
};

/**
 * The specs this one depends on: every `uses` block id and every entry of the `plugin` block's
 * `dependsOn: [...]`, in document order.
 */
export const specDependencies = (text: string): Dependency[] => {
  const deps: Dependency[] = [];
  for (const { type, id, from, body } of parseMdlBlocks(text)) {
    const headerStart = text.indexOf('\n', from) + 1;
    const bodyStart = text.indexOf('\n', headerStart) + 1;
    if (type === 'uses' && id) {
      const idFrom = text.indexOf(id, headerStart + text.slice(headerStart).search(/\S/) + type.length);
      deps.push({ id, via: 'uses', from: idFrom, to: idFrom + id.length });
    } else if (type === 'plugin') {
      const list = body.match(/^[ \t]+dependsOn:[ \t]*\[([^\]\n]*)\]/m);
      if (list?.index !== undefined) {
        const listFrom = bodyStart + list.index + list[0].length - list[1].length - 1;
        for (const entry of list[1].matchAll(/[^\s,]+/g)) {
          const idFrom = listFrom + entry.index;
          deps.push({ id: entry[0], via: 'dependsOn', from: idFrom, to: idFrom + entry[0].length });
        }
      }
    }
  }
  return deps;
};
