//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { formatSeconds, isOver } from '../TakeList/TakeList.tsx';

/** A slide in the presentation's voice-over: its main take's length against the slide's desired length. */
export type SlideTakesItem = {
  id: string;
  title: string;
  /** How many takes the slide has. */
  takes: number;
  /** Length of the slide's main take, in seconds; undefined when it has none. */
  duration?: number;
  /** The slide's desired length, in seconds. */
  desired?: number;
};

export type SlideTakesListProps = {
  slides: SlideTakesItem[];
  /** The slide whose main take is playing. */
  playing?: string;
  onPlay?: (id: string) => void;
  onOpen?: (id: string) => void;
};

/**
 * The presentation's voice-over, slide by slide: each slide's main take (the read used when the voice-over plays or
 * is exported), flagged when longer than the slide's desired length, or a gap where a slide has none.
 */
export const SlideTakesList = ({ slides, playing, onPlay, onOpen }: SlideTakesListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <ol className='flex flex-col' data-testid='recorder.slides'>
      {slides.map((slide, index) => {
        const over = isOver(slide.duration, slide.desired);
        return (
          <li
            key={slide.id}
            className='flex items-center gap-2 border-b border-separator-subtle py-1'
            data-testid='recorder.slide'
            data-recorded={slide.duration !== undefined}
          >
            <span className='w-6 text-end font-mono text-sm text-fg-subtle'>{index + 1}</span>
            <Button.Root variant='ghost' classNames='grow justify-start truncate' onClick={() => onOpen?.(slide.id)}>
              <span className='truncate'>{slide.title}</span>
            </Button.Root>
            <span className='text-xs text-fg-subtle'>{t('take-count.label', { count: slide.takes })}</span>
            <span className={mx('w-24 text-end font-mono text-sm', over ? 'text-error-text' : 'text-fg-muted')}>
              {slide.duration === undefined ? t('no-take.label') : formatSeconds(slide.duration)}
              {slide.desired !== undefined && ` / ${formatSeconds(slide.desired)}`}
            </span>
            <Button.Root
              data-testid='recorder.slide.play'
              icon={playing === slide.id ? 'ph--stop--regular' : 'ph--play--regular'}
              iconOnly
              variant='ghost'
              disabled={slide.duration === undefined}
              label={t(playing === slide.id ? 'stop-take.label' : 'play-take.label')}
              onClick={() => onPlay?.(slide.id)}
            />
          </li>
        );
      })}
    </ol>
  );
};

SlideTakesList.displayName = 'SlideTakesList';
