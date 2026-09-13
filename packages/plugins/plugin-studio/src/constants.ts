//
// Copyright 2026 DXOS.org
//

import { meta } from '#meta';

/** Navtree node `type` for the Studio section (sibling of other content sections). */
export const STUDIO_SECTION_TYPE = `${meta.profile.key}.studio-section`;

/** Navtree node `type` for the virtual "Artifacts" node. */
export const ARTIFACTS_NODE_TYPE = `${meta.profile.key}.artifacts`;

/** Sentinel `data` for the virtual "Artifacts" node; the ArtifactsArticle surface matches on it. */
export const ARTIFACTS_NODE_DATA = `${meta.profile.key}.artifacts-node`;

/** Path segment / node id for the Studio section under the `content` group. */
export const STUDIO_SEGMENT = 'studio';

/** Path segment / node id for the Artifacts node under the Studio section. */
export const ARTIFACTS_SEGMENT = 'artifacts';

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
