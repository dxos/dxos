//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Artifact } from '#types';

import { useArtifactCoverSource } from '../../hooks/index.ts';
import { GalleryImage } from '../GalleryImage/index.ts';

export type ArtifactCardProps = {
  subject: Artifact.Artifact;
};

/**
 * Card rendering of an {@link Artifact} — its cover-variant thumbnail. Contributed as the
 * `CardContent` surface so Artifacts compose into collections/boards (masonry, spatial lightbox)
 * rendered by the host, honoring "layout reuses existing types".
 */
export const ArtifactCard = ({ subject }: ArtifactCardProps) => {
  const { src, contentType } = useArtifactCoverSource(subject);
  return <GalleryImage src={src} contentType={contentType} alt={subject.name} />;
};

ArtifactCard.displayName = 'ArtifactCard';
