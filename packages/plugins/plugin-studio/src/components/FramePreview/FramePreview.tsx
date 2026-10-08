//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type FramePreviewProps = Util.ThemedClassName<{
  /** Zero-based position in the storyboard; shown one-based. */
  index: number;
  name?: string;
  /** Resolved cover source (a remote URL, or a `data:`/`blob:` URL for a file). */
  src?: string;
  /** Mime of the source — selects `<video>` vs `<img>`. */
  contentType?: string;
}>;

/**
 * A storyboard frame's thumbnail: the artifact's cover at 16:9, or a "Frame n" placeholder when
 * nothing has been produced yet. Presentation-only — the source is already resolved.
 */
export const FramePreview = ({ classNames, index, name, src, contentType }: FramePreviewProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const isVideo = contentType?.startsWith('video/') ?? false;
  const label = t('frame-preview.label', { index: index + 1 });

  return (
    <figure className={mx('flex flex-col gap-1 min-w-0', classNames)}>
      <div
        className='relative overflow-hidden rounded-sm bg-modal-surface'
        style={{ aspectRatio: 16 / 9 }}
        data-testid='studio.frame-preview'
      >
        {src && isVideo ? (
          <video
            src={src}
            muted
            playsInline
            preload='metadata'
            draggable={false}
            className='block dx-fill object-cover'
          />
        ) : src ? (
          <img src={src} alt={name ?? label} loading='lazy' draggable={false} className='block dx-fill object-cover' />
        ) : (
          <Layout.Flex role='img' aria-label={label} center classNames='dx-fill text-fg-muted'>
            {label}
          </Layout.Flex>
        )}
        <span className='absolute top-1 start-1 px-1 rounded-sm bg-modal-surface text-xs text-fg-muted'>
          {index + 1}
        </span>
      </div>
      {name && <figcaption className='truncate text-sm text-fg-muted'>{name}</figcaption>}
    </figure>
  );
};

FramePreview.displayName = 'FramePreview';
