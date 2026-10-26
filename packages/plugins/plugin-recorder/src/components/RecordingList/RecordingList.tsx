//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** `m:ss`. */
export const formatSeconds = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Over the desired length, compared as shown (whole seconds), so a row never reads 0:20 / 0:20 and flagged. */
export const isOver = (seconds: number | undefined, desired: number | undefined): boolean =>
  seconds !== undefined && desired !== undefined && Math.round(seconds) > Math.round(desired);

/** A row: a take of a slide, or a slide of the presentation with its main take. */
export type RecordingItem = {
  id: string;
  title: string;
  /** Secondary text: a slide's take count, or why a take is not saved. */
  description?: string;
  /** Length of the take (a slide's main take), in seconds; undefined when there is none. */
  duration?: number;
  /** The slide's desired length, in seconds. */
  desired?: number;
  /** The slide's main take. */
  main?: boolean;
  /** The take recorded a picture besides the voice. */
  video?: boolean;
  /** The take is not saved yet. */
  error?: boolean;
  /** Position shown before the title (a slide's number). */
  index?: number;
};

export type RecordingListProps = {
  items: RecordingItem[];
  /** The current row, which the toolbar's actions and the status bar's player act on. */
  value?: string;
  onValueChange?: (id: string) => void;
  /** Accessible name of the list. */
  label: string;
};

/**
 * The rows of a Recordings companion: a slide's takes, or a presentation's slides. Keyboard navigable (the current
 * row moves with up and down, and scrolls into view); each row shows its length against the desired length, flagged
 * when over, and marks the main take.
 */
export const RecordingList = ({ items, value, onValueChange, label }: RecordingListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const options = useMemo(
    () => items.map((item) => ({ value: item.id, label: item.title, description: item.description })),
    [items],
  );

  return (
    <Listbox.Root items={options} value={value ?? ''} onValueChange={(id) => onValueChange?.(id)}>
      <Listbox.Content aria-label={label} data-testid='recorder.list'>
        {items.map((item) => {
          const over = isOver(item.duration, item.desired);
          return (
            <Listbox.Item
              key={item.id}
              id={item.id}
              data-testid='recorder.item'
              data-main={item.main ? 'true' : undefined}
              data-recorded={item.duration !== undefined ? 'true' : undefined}
            >
              <Listbox.ItemIcon
                icon={
                  item.error
                    ? 'ph--warning--regular'
                    : item.main
                      ? 'ph--star--fill'
                      : item.video
                        ? 'ph--video-camera--regular'
                        : 'ph--microphone--regular'
                }
                classNames={mx(item.error && 'text-error-text', item.main && 'text-accent-text')}
              />
              <Listbox.ItemText>
                {item.index !== undefined && <span className='me-2 tabular-nums text-fg-subtle'>{item.index + 1}</span>}
                {item.title}
              </Listbox.ItemText>
              {item.description && (
                <Listbox.ItemDescription classNames={mx(item.error && 'text-error-text')}>
                  {item.description}
                </Listbox.ItemDescription>
              )}
              <span
                data-over={over ? 'true' : undefined}
                className={mx('shrink-0 font-mono text-sm', over ? 'text-error-text' : 'text-fg-muted')}
              >
                {item.duration === undefined ? t('no-take.label') : formatSeconds(item.duration)}
                {item.desired !== undefined && ` / ${formatSeconds(item.desired)}`}
              </span>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

RecordingList.displayName = 'RecordingList';
