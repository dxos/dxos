//
// Copyright 2026 DXOS.org
//

/** The media kinds studio renders; the create dialog offers exactly these. A new medium adds one here. */
export const KINDS = ['image', 'video'] as const;
export type Kind = (typeof KINDS)[number];

/** Presentation metadata for an artifact `kind` (image/video/…) — the glyph shown on nodes, cards,
 * and the create menu. Keyed by the open `kind` discriminator so a new medium adds an entry here. */
export const KIND_META: Record<Kind, { icon: string }> = {
  image: { icon: 'ph--image--regular' },
  video: { icon: 'ph--video--regular' },
};

/** Icon representing an artifact's `kind` (falls back to a generic glyph for an unknown kind). */
export const getKindIcon = (kind: string): string => (isKind(kind) ? KIND_META[kind].icon : 'ph--sparkle--regular');

/** Whether a stored `kind` is one studio renders. */
export const isKind = (kind: string): kind is Kind => KINDS.some((candidate) => candidate === kind);
