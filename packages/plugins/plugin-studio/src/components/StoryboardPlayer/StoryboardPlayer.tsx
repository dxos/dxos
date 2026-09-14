//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { MediaPlayer, Panel, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

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
  /** The plank the toolbar is attended through. */
  attendableId?: string;
  onClose?: () => void;
}>;

const DEFAULT_STILL_MS = 4_000;

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

  const menuActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'previous',
          {
            label: ['previous-frame.label', { ns: meta.profile.key }],
            icon: 'ph--caret-left--regular',
            disposition: 'toolbar',
            disabled: index === 0,
          },
          () => setIndex((current) => Math.max(0, current - 1)),
        )
        .action(
          'position',
          {
            variant: 'custom',
            label: ['play.label', { ns: meta.profile.key }],
            render: () => (
              <span className='tabular-nums'>
                {index + 1} / {clips.length}
              </span>
            ),
          },
          () => {},
        )
        .action(
          'next',
          {
            label: ['next-frame.label', { ns: meta.profile.key }],
            icon: 'ph--caret-right--regular',
            disposition: 'toolbar',
            disabled: index + 1 >= clips.length,
          },
          advance,
        )
        .separator()
        .action(
          'title',
          {
            variant: 'custom',
            label: ['play.label', { ns: meta.profile.key }],
            render: () => <span className='truncate'>{clip?.name}</span>,
          },
          () => {},
        )
        .separator()
        .action(
          'close',
          {
            label: ['close.label', { ns: meta.profile.key }],
            icon: 'ph--x--regular',
            disposition: 'toolbar',
            disabled: !onClose,
          },
          () => onClose?.(),
        )
        .build(),
    [index, clips.length, clip?.name, advance, onClose],
  );

  if (!clip) {
    return null;
  }

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content>
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
      </Panel.Content>
    </Panel.Root>
  );
};

StoryboardPlayer.displayName = 'StoryboardPlayer';
