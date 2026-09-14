//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MediaArtifact } from '#types';

import { useMediaArtifactCoverSource } from '../../hooks/index.ts';
import { GalleryImage } from '../GalleryImage/index.ts';

export type ArtifactCardProps = {
  subject: MediaArtifact.MediaArtifact;
};

/**
 * Card rendering of an {@link MediaArtifact} — its cover-variant thumbnail. Contributed as the
 * `CardContent` surface so Artifacts compose into collections/boards (masonry, spatial lightbox)
 * rendered by the host, honoring "layout reuses existing types".
 */
export const MediaArtifactCard = ({ subject }: ArtifactCardProps) => {
  const { src, contentType } = useMediaArtifactCoverSource(subject);
  return <GalleryImage src={src} contentType={contentType} alt={subject.name} />;
};

MediaArtifactCard.displayName = 'MediaArtifactCard';
