//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';

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
  const { src, contentType } = useMediaArtifactCoverSource(subject);
  const label = Obj.getLabel(subject) ?? '';
  const isVideo = contentType?.startsWith('video/') ?? false;
  return (
    <Card.Body>
      {src && isVideo ? (
        // A video cover shows its first frame; `Card.Poster` renders images only.
        <video src={src} muted playsInline preload='metadata' className='block w-full aspect-video object-cover' />
      ) : (
        <Card.Poster alt={label} image={src} icon={src ? undefined : 'ph--image--regular'} fit='cover' />
      )}
    </Card.Body>
  );
};

MediaArtifactCard.displayName = 'MediaArtifactCard';
