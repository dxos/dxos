//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { MediaPlayer, Panel, type ThemedClassName, Toolbar, composableProps, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { meta } from '#meta';

/** One playable frame: the artifact's cover variant. */
export type StoryboardClip = {
  id: string;
  name?: string;
  src: string;
  contentType?: string;
};

const DEFAULT_STILL_MS = 4_000;

export type StoryboardPlayerProps = ThemedClassName<{
  clips: readonly StoryboardClip[];
  /** How long a still is shown before advancing. */
  stillMs?: number;
  /** The plank the toolbar is attended through. */
  attendableId?: string;
  onClose?: () => void;
}>;

/**
 * Plays a storyboard's frames back to back in one player — a view-time splice: one `<video>` whose
 * source advances on `ended`, and stills that advance on a timer. No file is produced; see the
 * design doc for the ffmpeg.wasm splice that would.
 */
export const StoryboardPlayer = ({
  classNames,
  clips,
  stillMs = DEFAULT_STILL_MS,
  attendableId,
  onClose,
}: StoryboardPlayerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const clip = clips[index];
  const isVideo = clip?.contentType?.startsWith('video/') ?? false;

  const advance = useCallback(
    () => setIndex((current) => (current + 1 < clips.length ? current + 1 : current)),
    [clips.length],
  );

  // A still cannot end, so it advances on a timer; the timer follows the clip so a skip resets it.
  useEffect(() => {
    if (!clip || isVideo) {
      return;
    }
    const timer = setTimeout(advance, stillMs);
    return () => clearTimeout(timer);
  }, [clip, isVideo, advance, stillMs]);

  // Opening the player unmounts whatever control opened it, which drops focus to the body; the
  // toolbar takes it back so the plank stays attended (attention follows focus into an attendable)
  // and the transport is a key away. The attendable attributes mark the panel as that attention's
  // surface, which is what draws the attention ring.
  const attentionAttributes = useAttentionAttributes(attendableId);
  useEffect(() => {
    toolbarRef.current?.focus();
  }, []);

  if (!clip) {
    return null;
  }

  return (
    <Panel.Root {...composableProps({ classNames }, attentionAttributes)}>
      <Panel.Toolbar asChild>
        <Toolbar.Root ref={toolbarRef} tabIndex={-1} classNames='outline-none'>
          {/* Laid out by hand — nav + position, the title centred, close — as one grid child rather
              than a grid on the root: the root brackets its children with focus sentinels, which
              would take the first and last cells. */}
          <div className='grow grid grid-cols-[auto_1fr_auto] items-center gap-1'>
            <div className='flex items-center gap-1'>
              <Toolbar.IconButton
                iconOnly
                icon='ph--caret-left--regular'
                density='sm'
                label={t('previous-frame.label')}
                disabled={index === 0}
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
              />
              <span className='tabular-nums whitespace-nowrap'>
                {index + 1} / {clips.length}
              </span>
              <Toolbar.IconButton
                iconOnly
                icon='ph--caret-right--regular'
                density='sm'
                label={t('next-frame.label')}
                disabled={index + 1 >= clips.length}
                onClick={advance}
              />
            </div>
            <span className='min-w-0 truncate text-center'>{clip.name}</span>
            <div className='flex justify-end'>
              <Toolbar.IconButton
                iconOnly
                icon='ph--x--regular'
                label={t('close.label')}
                disabled={!onClose}
                onClick={() => onClose?.()}
              />
            </div>
          </div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='bg-scrim-surface'>
        {/* Keyed by clip so the element remounts and autoplays the next source. */}
        <MediaPlayer
          key={clip.id}
          classNames='dx-expand bg-neutral-100 dark:bg-neutral-800'
          src={clip.src}
          kind={isVideo ? 'video' : undefined}
          fit='contain'
          autoPlay
          alt={clip.name}
          onEnded={advance}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

StoryboardPlayer.displayName = 'StoryboardPlayer';
