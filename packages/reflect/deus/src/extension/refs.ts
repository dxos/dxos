//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks, scanFenceLines } from './blocks.ts';

/** A `<spec id>#<item>` reference, with the offsets of the whole reference text. */
export type SpecRef = { id: string; item: string; from: number; to: number };

/** A spec this one depends on, with the offsets of the id text. */
export type Dependency = { id: string; via: 'uses' | 'dependsOn'; from: number; to: number };

// The lookbehind rejects `github:org/repo/file.mdl#X` keys and URL fragments; the final `\w` drops a sentence period.
// Segments after the first may be camelCase, as plugin ids are (`org.dxos.plugin.fileSystem`).
const REF = /(?<![\w/:.#-])([a-z][a-z0-9-]*(?:\.[a-zA-Z0-9-]+)+)#([\w$.-]*\w)/g;

/**
 * Calls `visit` for each line of prose and of `mdl` fences, with the line's offset in the text.
 * Every other fenced block is skipped, since it holds code rather than spec text.
 */
export const scanSpecLines = (text: string, visit: (line: string, offset: number) => void): void =>
  scanFenceLines(text, ({ line, offset, kind, mdl }) => {
    if (kind === 'prose' || (kind === 'body' && mdl)) {
      visit(line, offset);
    }
  });

/** Finds `<spec id>#<item>` references in prose and in `mdl` fences (comments included). */
export const findSpecRefs = (text: string): SpecRef[] => {
  const refs: SpecRef[] = [];
  scanSpecLines(text, (line, offset) => {
    for (const match of line.matchAll(REF)) {
      const from = offset + match.index;
      refs.push({ id: match[1], item: match[2], from, to: from + match[0].length });
    }
  });
  return refs;
};

const GITHUB_SPEC_KEY = /github:[^\s`'")\]>,]*?\.mdl(?![\w/-]|\.\w)(?:#[\w$.-]*)?/g;

/** Finds `github:` keys that point at a `.mdl` file, with the offsets of the whole key. */
export const findSpecKeys = (text: string): { from: number; to: number }[] => {
  const keys: { from: number; to: number }[] = [];
  scanSpecLines(text, (line, offset) => {
    for (const match of line.matchAll(GITHUB_SPEC_KEY)) {
      keys.push({ from: offset + match.index, to: offset + match.index + match[0].length });
    }
  });
  return keys;
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
      let lineFrom = bodyStart;
      let inList = false;
      for (const line of body.split('\n')) {
        const field = line.match(/^[ \t]+dependsOn:[ \t]*(.*?)[ \t]*$/);
        if (field) {
          const inline = field[1].match(/^\[([^\]]*)\]/);
          inList = field[1] === '' || field[1].startsWith('#');
          if (inline) {
            const listFrom = lineFrom + line.indexOf('[', line.indexOf('dependsOn:')) + 1;
            for (const entry of inline[1].matchAll(/[^\s,]+/g)) {
              const idFrom = listFrom + entry.index;
              deps.push({ id: entry[0], via: 'dependsOn', from: idFrom, to: idFrom + entry[0].length });
            }
          }
        } else if (inList) {
          const item = line.match(/^[ \t]+-[ \t]+([^\s#]+)/);
          if (item) {
            const idFrom = lineFrom + line.indexOf(item[1]);
            deps.push({ id: item[1], via: 'dependsOn', from: idFrom, to: idFrom + item[1].length });
          } else if (line.trim() !== '') {
            inList = false;
          }
        }
        lineFrom += line.length + 1;
      }
    }
  }
  return deps;
};
