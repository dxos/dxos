//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Flex, IconButton, MediaPlayer, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** One playable frame: the artifact's cover variant. */
export type StoryboardClip = {
  id: string;
  name?: string;
  src: string;
  contentType?: string;
};

export type StoryboardPlayerProps = ThemedClassName<{
  clips: StoryboardClip[];
  /** How long a still is shown before advancing. */
  stillMs?: number;
  onClose?: () => void;
}>;

const DEFAULT_STILL_MS = 4_000;

/**
 * Plays a storyboard's frames back to back in one player — a view-time splice: one `<video>` whose
 * source advances on `ended`, and stills that advance on a timer. No file is produced; see the
 * design doc for the ffmpeg.wasm splice that would.
 */
export const StoryboardPlayer = ({ classNames, clips, stillMs = DEFAULT_STILL_MS, onClose }: StoryboardPlayerProps) => {
  const { t } = useTranslation(meta.profile.key);
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

  if (!clip) {
    return null;
  }

  return (
    <div className={mx('grid grid-rows-[1fr_auto] dx-expand', classNames)}>
      {/* Keyed by clip so the element remounts and autoplays the next source. */}
      <MediaPlayer
        key={clip.id}
        classNames='dx-expand'
        src={clip.src}
        kind={isVideo ? 'video' : undefined}
        fit='contain'
        autoPlay
        alt={clip.name}
        onEnded={advance}
      />
      <Flex align='center' gap='xs' classNames='p-2 border-t border-subdued-separator'>
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--skip-back--regular'
          label={t('previous-frame.label')}
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        />
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--skip-forward--regular'
          label={t('next-frame.label')}
          disabled={index + 1 >= clips.length}
          onClick={advance}
        />
        <span className='grow truncate text-description'>
          {index + 1} / {clips.length}
          {clip.name ? ` — ${clip.name}` : ''}
        </span>
        {onClose && (
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label={t('close.label')} onClick={onClose} />
        )}
      </Flex>
    </div>
  );
};

StoryboardPlayer.displayName = 'StoryboardPlayer';
