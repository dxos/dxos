//
// Copyright 2026 DXOS.org
//

import { Organization, Person } from '@dxos/types';

import { type Clip } from '#types';

const MAX_NOTES_LENGTH = 4000;

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
 * Dispatch based on the clip's declared kind. Returns `undefined` for unknown
 * kinds so the caller can respond with an `unsupportedKind` error.
 */
export const mapClip = (clip: Clip.Clip) => {
  switch (clip.kind) {
    case 'person':
      return toPerson(clip);
    case 'organization':
      return toOrganization(clip);
    default:
      return undefined;
  }
};
