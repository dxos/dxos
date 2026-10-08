//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useLabel, useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';

import { type MediaArtifact } from '#types';

import { useMediaArtifactCoverSource } from '../../hooks/index.ts';

export type MediaArtifactCardProps = {
  subject: MediaArtifact.MediaArtifact;
};

/**
 * Card rendering of a {@link MediaArtifact}: its cover variant as the poster. Rendered into the
 * `AppSurface.CardContent` slot — `Card.Root` and the header (title, drag handle) are the host's (a
 * board cell, a popover), so this emits `Card.Body` only; the gallery, which owns its tiles, uses
 * `GalleryImage` instead.
 */
export const MediaArtifactCard = ({ subject }: MediaArtifactCardProps) => {
  const [snapshot] = useObject(subject);
  const { src, contentType } = useMediaArtifactCoverSource(snapshot);
  const label = useLabel(subject) ?? '';
  const isVideo = contentType?.startsWith('video/') ?? false;
  return (
    <Card.Body>
      {src && isVideo ? (
        // A video cover shows its first frame; `Card.Poster` renders images only.
        <video src={src} muted playsInline preload='metadata' className='block w-full aspect-video object-cover' />
      ) : (
        <Card.Poster alt={label} src={src} fit='cover' />
      )}
    </Card.Body>
  );
};

MediaArtifactCard.displayName = 'MediaArtifactCard';
