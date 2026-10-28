//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** `m:ss`, for a slide's elapsed and desired length. */
export const formatDuration = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

//
// Subtitles
//

export type SubtitlesProps = {
  lines: string[];
};

/**
 * The current slide's speaker notes over the bottom of a presented slide. The band sits on the slide's black void,
 * not the app theme, so its colors are fixed like a video's captions.
 */
const Subtitles = ({ lines }: SubtitlesProps) => {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div
      data-testid='presenter.subtitles'
      className='pointer-events-none absolute inset-x-0 bottom-16 z-[200] flex justify-center px-8'
    >
      <div className='max-w-[80%] rounded-md bg-black/70 px-6 py-3 text-center text-2xl leading-snug text-white'>
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
};

Subtitles.displayName = 'SpeakerNotes.Subtitles';

//
// Prompter
//

export type PrompterProps = {
  /** Title of the current slide. */
  title?: string;
  lines: string[];
  /** Title and notes of the slide after this one. */
  next?: { title?: string; lines: string[] };
  /** Position among the presented slides, and their count. */
  index: number;
  count: number;
  /** Seconds since the slide came on screen. */
  elapsed: number;
  /** Desired length of the slide, in seconds. */
  duration?: number;
};

/**
 * The speaker's view of the presented slide: its notes large, one line per sentence, with the time on the slide
 * against its desired length, and the next slide's notes below.
 */
const Prompter = ({ title, lines, next, index, count, elapsed, duration }: PrompterProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // Compared as shown (whole seconds), so the time never reads 0:15 / 0:15 and flagged.
  const over = duration !== undefined && Math.round(elapsed) > Math.round(duration);

  return (
    <Panel.Root data-testid='presenter.prompter'>
      <Panel.Header classNames='flex items-center gap-4 px-4 py-2 text-fg-muted'>
        <span className='font-mono'>{t('slide-position.label', { index: index + 1, count })}</span>
        <span className='grow truncate'>{title}</span>
        <span
          data-testid='presenter.prompter.time'
          data-over={over}
          className={mx('font-mono', over && 'text-error-text')}
        >
          {formatDuration(elapsed)}
          {duration !== undefined && ` / ${formatDuration(duration)}`}
        </span>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='flex flex-col gap-8 p-6'>
            <div className='text-4xl leading-snug'>
              {lines.length > 0 ? (
                lines.map((line, index) => <p key={index}>{line}</p>)
              ) : (
                <p className='text-fg-subtle'>{t('no-notes.label')}</p>
              )}
            </div>
            {next && (
              <div className='text-lg text-fg-subtle'>
                <p className='font-medium'>{t('next-slide-notes.label', { title: next.title ?? '' })}</p>
                {next.lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

Prompter.displayName = 'SpeakerNotes.Prompter';

export const SpeakerNotes = {
  Subtitles,
  Prompter,
};
