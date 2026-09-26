//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card, useTranslation } from '@dxos/react-ui';
import { type File } from '@dxos/types';

import { meta } from '#meta';

import { useFileUrl } from '../../hooks/index.ts';

export type FileCardProps = AppSurface.ObjectCardProps<File.File>;

/**
 * A file's card body: an image or a video's first frame as the poster, any other kind as its type
 * and size. Rendered into the `AppSurface.CardContent` slot — the host owns `Card.Root` and the
 * header with the file's name — so a file embedded in a chat, or previewed from a link, shows what
 * it holds rather than a form of its properties.
 */
export const FileCard = ({ subject: file }: FileCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const rendered = useFileUrl(file);
  if (!rendered) {
    return null;
  }

  const { url, type, size } = rendered;
  return (
    <Card.Body>
      {type.startsWith('image/') ? (
        // Cover, not contain: a contained image letterboxes inside the 16:9 poster instead of spanning the card.
        <Card.Poster alt={file.name ?? ''} image={url} />
      ) : type.startsWith('video/') ? (
        <video src={url} muted playsInline preload='metadata' className='block w-full aspect-video object-contain' />
      ) : (
        <Card.Row>
          <Card.Text variant='description'>
            {type}
            {size !== undefined && ` · ${t('file-size.label', { size: formatSize(size) })}`}
          </Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};

FileCard.displayName = 'FileCard';

export default FileCard;

/** `1.2 MB` — the unit that keeps the number under four digits. */
const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
};
