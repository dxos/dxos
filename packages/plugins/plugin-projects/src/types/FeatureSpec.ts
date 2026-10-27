//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Feature from './Feature.ts';

/** One `feat` block of an `.mdl` spec, as the fields of the feature it becomes. */
export type SpecFeature = {
  /** The block's identifier, e.g. `F-3`. */
  id: string;
  /** The title after the header's colon; the identifier when there is none. */
  name: string;
  /** The block's prose before its first `req` line. */
  description?: string;
  requirements: Feature.Requirement[];
  /** The id of the feature this one is part of: the nearest dotted prefix the spec declares (`F-3.1` → `F-3`). */
  parent?: string;
};

const FENCE = /^```mdl[ \t]*\n([\s\S]*?)^```/gm;
const FEAT_HEADER = /^feat[ \t]+([^\s:]+)[ \t]*(?::[ \t]*(.*?))?[ \t]*$/;
/** An unindented `<kind> <id>` line, which opens another block inside the same fence. */
const BLOCK_HEADER = /^[a-z]\w*[ \t]+[^\s:]/;
const REQ_LINE = /^req[ \t]+([^\s:]+)[ \t]*:[ \t]*(.*)$/;

/** Joins wrapped lines into one paragraph, keeping blank lines as paragraph breaks. */
const joinLines = (lines: readonly string[]): string =>
  lines
    .join('\n')
    .split(/\n[ \t]*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .join('\n\n');

/** The blocks of each fence, each its header line followed by its body lines; one fence may hold several. */
const splitBlocks = (text: string): string[][] =>
  [...text.matchAll(FENCE)].flatMap(([, body]) =>
    body
      .replace(/\n$/, '')
      .split('\n')
      .reduce<string[][]>((blocks, line) => {
        if (blocks.length === 0 || BLOCK_HEADER.test(line)) {
          blocks.push([line]);
        } else {
          blocks[blocks.length - 1].push(line);
        }
        return blocks;
      }, []),
  );

/** The nearest dotted prefix of `id` among `ids`. */
const parentOf = (id: string, ids: ReadonlySet<string>): string | undefined => {
  for (let dot = id.lastIndexOf('.'); dot > 0; dot = id.lastIndexOf('.', dot - 1)) {
    if (ids.has(id.slice(0, dot))) {
      return id.slice(0, dot);
    }
  }
  return undefined;
};

/**
 * The features a spec declares: every `feat` block, in document order, including each later block of a fence that
 * holds several. A `req` line's continuation is the indented text below it, up to the next `req` line; anything else
 * in the block before the first `req` is the description. A dotted feature id names its parent feature.
 */
export const parse = (text: string): SpecFeature[] => {
  const features: SpecFeature[] = [];
  for (const [header, ...lines] of splitBlocks(text)) {
    const match = header.trim().match(FEAT_HEADER);
    if (!match) {
      continue;
    }
    const [, id, title] = match;
    const prose: string[] = [];
    const requirements: { id: string; lines: string[] }[] = [];
    for (const line of lines) {
      const req = line.trim().match(REQ_LINE);
      if (req) {
        requirements.push({ id: req[1], lines: [req[2]] });
      } else if (requirements.length > 0) {
        requirements[requirements.length - 1].lines.push(line);
      } else {
        prose.push(line);
      }
    }
    const description = joinLines(prose);
    features.push({
      id,
      name: title || id,
      ...(description && { description }),
      requirements: requirements.map(({ id, lines }) => ({ id, text: joinLines(lines) })),
    });
  }
  const ids = new Set(features.map(({ id }) => id));
  return features.map((feature) => {
    const parent = parentOf(feature.id, ids);
    return parent ? { ...feature, parent } : feature;
  });
};

/** The provenance a feature records for the block it came from: the spec's repo path and the block id. */
export const getSource = (path: string, id: string): string => `${path.replace(/#.*$/, '')}#${id}`;
