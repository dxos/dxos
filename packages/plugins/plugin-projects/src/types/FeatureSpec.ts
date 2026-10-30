//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Feature from './Feature.ts';

/** One `feat` block of an `.mdl` spec, as the fields of the feature it becomes. */
export type SpecFeature = {
  /** The block's identifier, e.g. `F-3`. */
  id: string;
  /** The title after the header's colon; the identifier when there is none. */
  name: string;
  /** The block's `desc:` field, or its prose before the first `req` line. */
  description?: string;
  /** The block's `status:` line, when it names a known status. */
  status?: Feature.Status;
  requirements: Feature.Requirement[];
  /** Offsets of the whole fence, opening and closing lines included. */
  from: number;
  to: number;
};

const FENCE = /^```mdl[ \t]*\n([\s\S]*?)^```/gm;
const FEAT_HEADER = /^feat[ \t]+([^\s:]+)[ \t]*(?::[ \t]*(.*?))?[ \t]*$/;
const REQ_LINE = /^req[ \t]+([^\s:]+)[ \t]*:[ \t]*(.*)$/;
const STATUS_LINE = /^status[ \t]*:[ \t]*(\S+)[ \t]*$/;
/** A line that starts a field of its own (`when:`, `then:`, `desc:`) rather than continuing the one above. */
const FIELD_LINE = /^[a-z][\w-]*:(?:[ \t]|$)/;
/** The `desc:` field marker, with a YAML block indicator (`|`, `>`) when the prose is on the lines below. */
const DESC_FIELD = /^desc:[ \t]*(?:[|>][-+]?[ \t]*)?/;
const isStatus = Schema.is(Feature.Status);

/** The status of a feature whose block states none. */
export const DEFAULT_STATUS: Feature.Status = 'planned';

/**
 * Joins wrapped lines into one line each, keeping a line that starts a field (`when:`, `then:`) on a line of its own
 * and blank lines as paragraph breaks.
 */
const joinLines = (lines: readonly string[]): string =>
  lines
    .join('\n')
    .split(/\n[ \t]*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce<string[]>((joined, line) => {
          if (joined.length === 0 || FIELD_LINE.test(line)) {
            joined.push(line);
          } else {
            joined[joined.length - 1] += ` ${line}`;
          }
          return joined;
        }, [])
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');

/**
 * The text with every fence that holds more than one `feat` block, or other blocks before one, split so each `feat`
 * block is a fence of its own, which {@link parse} reads and an embed can replace.
 */
export const split = (text: string): string =>
  text.replace(FENCE, (fence, body: string) => {
    const lines = body.replace(/\n$/, '').split('\n');
    const starts = lines.flatMap((line, index) => (FEAT_HEADER.test(line) ? [index] : []));
    if (starts.length === 0 || (starts.length === 1 && starts[0] === 0)) {
      return fence;
    }
    const bounds = [...(starts[0] === 0 ? [] : [0]), ...starts, lines.length];
    return bounds
      .slice(0, -1)
      .map((start, index) => lines.slice(start, bounds[index + 1]))
      .map((segment) => segment.slice(0, segment.findLastIndex((line) => line.trim()) + 1))
      .filter((segment) => segment.length > 0)
      .map((segment) => ['```mdl', ...segment, '```'].join('\n'))
      .join('\n\n');
  });

/**
 * The features a spec declares: every fence that opens with a `feat` block, in document order; {@link split} the text
 * first where a fence may hold several. A `req` line's continuation is the indented text below it, up to the next `req`
 * line; before the first `req`, a `status:` line is the status and the rest, a `desc:` field or bare prose, is the
 * description.
 */
export const parse = (text: string): SpecFeature[] => {
  const features: SpecFeature[] = [];
  for (const fence of text.matchAll(FENCE)) {
    const body = fence[1];
    const [header, ...lines] = body.split('\n');
    const match = header.trim().match(FEAT_HEADER);
    if (!match) {
      continue;
    }
    const [, id, title] = match;
    const prose: string[] = [];
    const requirements: { id: string; lines: string[] }[] = [];
    let status: Feature.Status | undefined;
    for (const line of lines) {
      if (FEAT_HEADER.test(line)) {
        break;
      }
      const req = line.trim().match(REQ_LINE);
      const statusLine = requirements.length === 0 ? line.trim().match(STATUS_LINE) : null;
      if (statusLine) {
        status = isStatus(statusLine[1]) ? statusLine[1] : status;
      } else if (req) {
        requirements.push({ id: req[1], lines: [req[2]] });
      } else if (requirements.length > 0) {
        requirements[requirements.length - 1].lines.push(line);
      } else {
        prose.push(line);
      }
    }
    const description = joinLines(prose).replace(DESC_FIELD, '');
    features.push({
      id,
      name: title || id,
      ...(description && { description }),
      ...(status && { status }),
      requirements: requirements.map(({ id, lines }) => ({ id, text: joinLines(lines) })),
      from: fence.index,
      to: fence.index + fence[0].length,
    });
  }
  return features;
};

/** The provenance a feature records for the block it came from: the spec's repo path and the block id. */
export const getSource = (path: string, id: string): string => `${path.replace(/#.*$/, '')}#${id}`;

export type Fields = Pick<SpecFeature, 'name' | 'description' | 'status'> & {
  requirements?: readonly Feature.Requirement[];
};

const printHeader = (id: string, name: string) => (name && name !== id ? `feat ${id}: ${name}` : `feat ${id}`);
const printStatus = (status: Feature.Status) => `  status: ${status}`;
/** Text as indented lines: a blank line between paragraphs, and `first` before the first line. */
const printLines = (text: string, first: string): string[] =>
  text.split(/\n[ \t]*\n/).flatMap((paragraph, index) => [
    ...(index > 0 ? [''] : []),
    ...paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, lineIndex) => (index === 0 && lineIndex === 0 ? `${first}${line}` : `    ${line}`)),
  ]);
const printDescription = (description = '') => (description.trim() ? printLines(description, '  desc: ') : []);
/** A requirement that opens with a field (`when:`) starts on the line below its header, as the dialect writes it. */
const printRequirement = (id: string, requirement: Feature.Requirement, index: number) => {
  const header = `  req ${requirement.id ?? `${id}.${index + 1}`}:`;
  if (FIELD_LINE.test(requirement.text.trim())) {
    return [header, ...printLines(requirement.text, '    ')];
  }
  const lines = printLines(requirement.text, `${header} `);
  return lines.length > 0 ? lines : [header];
};

/** The `feat` block for a feature, as {@link parse} reads it back; requirements without an id are numbered under it. */
export const print = (id: string, { name, description, status, requirements = [] }: Fields): string =>
  [
    '```mdl',
    printHeader(id, name),
    ...(status ? [printStatus(status)] : []),
    ...printDescription(description),
    ...requirements.flatMap((requirement, index) => printRequirement(id, requirement, index)),
    '```',
  ].join('\n');

/**
 * A `feat` block rewritten to state `fields`, changing only what differs so the rest keeps its form: the header for a
 * new name, the status line, the prose for a new description, and each requirement whose text changed. Fields the
 * block holds beyond these are kept while its prose is unchanged.
 */
export const update = (block: string, fields: Fields): string => {
  const [before] = parse(block);
  if (!before) {
    return block;
  }
  const { id } = before;
  const lines = block.split('\n');
  const pre: string[] = [];
  const requirements = new Map<string, string[]>();
  let current: string[] | undefined;
  let statusIndex = -1;
  for (const line of lines.slice(2, -1)) {
    const req = line.trim().match(REQ_LINE);
    if (req) {
      current = [line];
      requirements.set(req[1], current);
    } else if (current) {
      current.push(line);
    } else {
      if (line.trim().match(STATUS_LINE)) {
        statusIndex = pre.length;
      }
      pre.push(line);
    }
  }

  let head = pre;
  if ((fields.description ?? '') !== (before.description ?? '')) {
    const status = statusIndex === -1 ? [] : [pre[statusIndex]];
    head = [...status, ...printDescription(fields.description)];
    statusIndex = status.length - 1;
  }
  if ((fields.status ?? DEFAULT_STATUS) !== (before.status ?? DEFAULT_STATUS)) {
    const status = fields.status ? [printStatus(fields.status)] : [];
    head =
      statusIndex === -1
        ? [...status, ...head]
        : [...head.slice(0, statusIndex), ...status, ...head.slice(statusIndex + 1)];
  }

  const texts = new Map(before.requirements.map((requirement) => [requirement.id, requirement.text]));
  const body = (fields.requirements ?? []).flatMap((requirement, index) => {
    const kept =
      requirement.id !== undefined && texts.get(requirement.id) === requirement.text
        ? requirements.get(requirement.id)
        : undefined;
    return kept ?? printRequirement(id, requirement, index);
  });

  return [
    lines[0],
    fields.name === before.name ? lines[1] : printHeader(id, fields.name),
    ...head,
    ...body,
    lines[lines.length - 1],
  ].join('\n');
};
