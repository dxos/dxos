//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Artifact } from '#types';

import { GalleryImage } from '../GalleryImage';
import { useArtifactCoverSource } from '../../hooks';

export type ArtifactCardProps = {
  subject: Artifact.Artifact;
};

/**
 * Card rendering of an {@link Artifact} — its cover-variant thumbnail. Contributed as the
 * `CardContent` surface so Artifacts compose into collections/boards (masonry, spatial lightbox)
 * rendered by the host, honoring "layout reuses existing types".
 */
export const ArtifactCard = ({ subject }: ArtifactCardProps) => {
  const src = useArtifactCoverSource(subject);
  return <GalleryImage src={src} alt={subject.name} />;
};

ArtifactCard.displayName = 'ArtifactCard';
