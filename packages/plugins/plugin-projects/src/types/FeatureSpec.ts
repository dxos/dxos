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
  /** The block's prose before its first `req` line. */
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
const isStatus = Schema.is(Feature.Status);

/** The status of a feature whose block states none. */
export const DEFAULT_STATUS: Feature.Status = 'planned';

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

/**
 * The features a spec declares: every fenced `feat` block, in document order. A `req` line's continuation is the
 * indented text below it, up to the next `req` line; a `status:` line before the first `req` is the status, and
 * anything else there is the description.
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
    const description = joinLines(prose);
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
const printDescription = (description = '') =>
  description
    .split(/\n[ \t]*\n/)
    .flatMap((paragraph, index) => [
      ...(index > 0 ? [''] : []),
      ...(paragraph.trim() ? [`  ${paragraph.trim()}`] : []),
    ]);
const printRequirement = (id: string, requirement: Feature.Requirement, index: number) =>
  `  req ${requirement.id ?? `${id}.${index + 1}`}: ${requirement.text}`;

/** The `feat` block for a feature, as {@link parse} reads it back; requirements without an id are numbered under it. */
export const print = (id: string, { name, description, status, requirements = [] }: Fields): string =>
  [
    '```mdl',
    printHeader(id, name),
    ...(status ? [printStatus(status)] : []),
    ...printDescription(description),
    ...requirements.map((requirement, index) => printRequirement(id, requirement, index)),
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
    return kept ?? [printRequirement(id, requirement, index)];
  });

  return [
    lines[0],
    fields.name === before.name ? lines[1] : printHeader(id, fields.name),
    ...head,
    ...body,
    lines[lines.length - 1],
  ].join('\n');
};
