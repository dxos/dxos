//
// Copyright 2026 DXOS.org
//

import { Markdown } from '@dxos/plugin-markdown/types';
import { Organization, Person } from '@dxos/types';

import { type Clip } from '#types';

const MAX_NOTES_LENGTH = 4000;

/**
 * Maximum length of the markdown body we write for a Note clip. Larger than
 * the embedded `notes` field on Person/Organization because a Markdown
 * document is the whole content, not a secondary annotation.
 */
const MAX_NOTE_BODY_LENGTH = 50_000;

const firstLine = (text: string | undefined): string | undefined => {
  if (!text) {
    return undefined;
  }
  const line = text
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  return line && line.length > 0 ? line : undefined;
};

const truncate = (text: string | undefined, max: number): string | undefined => {
  if (!text) {
    return undefined;
  }
  return text.length > max ? text.slice(0, max) : text;
};

/**
 * Best-effort mapping from an incoming Clip to a Person.
 * Every field is optional on the schema, so an empty name is acceptable.
 */
export const toPerson = (clip: Clip.Clip) => {
  const hints = clip.hints ?? {};
  const fullName = hints.h1 ?? hints.ogTitle ?? firstLine(clip.selection.text);
  return Person.make({
    fullName,
    image: hints.ogImage,
    notes: truncate(clip.selection.text, MAX_NOTES_LENGTH),
    urls: [
      {
        label: clip.source.title || clip.source.url,
        value: clip.source.url,
      },
    ],
  });
};

/**
 * Best-effort mapping from an incoming Clip to an Organization.
 */
export const toOrganization = (clip: Clip.Clip) => {
  const hints = clip.hints ?? {};
  const name = hints.ogTitle ?? hints.h1 ?? firstLine(clip.selection.text);
  return Organization.make({
    name,
    description: hints.ogDescription ?? truncate(clip.selection.text, MAX_NOTES_LENGTH),
    image: hints.ogImage,
    website: clip.source.url,
  });
};

/**
 * Best-effort mapping from an incoming Clip to a Markdown document.
 *
 * Builds a small prelude (title + source link + date) followed by the
 * picked subtree's rendered text. We deliberately don't attempt HTML →
 * Markdown conversion here — the picker's `innerText` already preserves
 * paragraph structure, and a full converter belongs in the pipeline
 * (where a future agent stage can take over) rather than baked into the
 * receiver.
 */
export const toNote = (clip: Clip.Clip) => {
  const hints = clip.hints ?? {};
  const title = hints.h1 ?? hints.ogTitle ?? firstLine(clip.selection.text) ?? clip.source.title;
  const body = truncate(clip.selection.text, MAX_NOTE_BODY_LENGTH) ?? '';

  const sourceLabel = clip.source.title || clip.source.url;
  const clippedAt = clip.source.clippedAt;
  const preludeLines = [
    title ? `# ${title}` : undefined,
    '',
    `_Clipped from [${sourceLabel}](${clip.source.url}) on ${clippedAt}._`,
    '',
    body,
  ].filter((line): line is string => line !== undefined);
  const content = preludeLines.join('\n');

  return Markdown.make({
    name: title ?? undefined,
    content,
  });
};

/**
 * Dispatch based on the clip's declared kind. Returns `undefined` for unknown
 * kinds so the caller can respond with an `unsupportedKind` error.
 */
export const mapClip = (clip: Clip.Clip) => {
  switch (clip.kind) {
    case 'person':
      return toPerson(clip);
    case 'organization':
      return toOrganization(clip);
    case 'note':
      return toNote(clip);
    default:
      return undefined;
  }
};
