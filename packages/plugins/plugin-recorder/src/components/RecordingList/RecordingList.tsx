//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useRef } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
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

export type RecordingListProps<T extends RecordingItem = RecordingItem> = {
  items: T[];
  /** The current (selected) row, which the toolbar's actions and the status bar's player act on; the arrow keys move it. */
  value?: string;
  onValueChange?: (id: string) => void;
  /** Accessible name of the list. */
  label: string;
  /** Buttons at the end of each row (play, open). */
  renderActions?: (item: T) => ReactNode;
};

/**
 * The rows of a Recordings companion, a list with columns (icon, label, takes, length, desired, buttons): a slide's takes, or a presentation's slides, keyboard navigable
 * (up and down move the current row, which scrolls into view). Each row shows its length against the desired
 * length, flagged when over, marks the main take, and carries its own buttons.
 */
export const RecordingList = <T extends RecordingItem>({
  items,
  value,
  onValueChange,
  label,
  renderActions,
}: RecordingListProps<T>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const keyboard = useRef(false);
  const columns = useMemo(
    () => ({
      description: items.some((item) => item.description),
      desired: items.some((item) => item.desired !== undefined),
    }),
    [items],
  );
  const options = useMemo(
    () => items.map((item) => ({ value: item.id, label: item.title, description: item.description })),
    [items],
  );

  return (
    <Listbox.Root
      items={options}
      value={value ?? ''}
      onValueChange={(id) => onValueChange?.(id)}
      // The current row is the selection: a keyboard move selects, while a pointer only highlights what it passes.
      onHighlightChange={(id) => {
        if (keyboard.current && id) {
          onValueChange?.(id);
        }
      }}
    >
      <Listbox.Content
        aria-label={label}
        data-testid='recorder.list'
        onKeyDownCapture={() => {
          keyboard.current = true;
        }}
        onPointerMove={() => {
          keyboard.current = false;
        }}
      >
        {items.map((item) => {
          const over = isOver(item.duration, item.desired);
          return (
            <Listbox.Item
              key={item.id}
              id={item.id}
              data-testid='recorder.item'
              data-main={item.main ? 'true' : undefined}
              data-recorded={item.duration !== undefined ? 'true' : undefined}
              classNames='flex items-center gap-2'
            >
              <Icon.Icon
                size='sm'
                icon={
                  item.error
                    ? 'ph--warning--regular'
                    : item.video
                      ? 'ph--video-camera--regular'
                      : 'ph--microphone--regular'
                }
                classNames={mx('shrink-0', item.error && 'text-error-text')}
              />
              <Listbox.ItemText classNames='min-w-0 grow truncate text-sm'>
                {item.index !== undefined && (
                  <span className='me-1.5 tabular-nums text-fg-subtle'>{item.index + 1}</span>
                )}
                {item.title}
              </Listbox.ItemText>
              {/* Fixed-width columns, so the take counts and lengths line up from row to row. */}
              {columns.description && (
                <span
                  className={mx(
                    'w-16 shrink-0 truncate text-end text-xs',
                    item.error ? 'text-error-text' : 'text-fg-subtle',
                  )}
                  title={item.description}
                >
                  {item.description}
                </span>
              )}
              <span
                data-over={over ? 'true' : undefined}
                className={mx('w-12 shrink-0 text-end font-mono text-xs', over ? 'text-error-text' : 'text-fg-muted')}
              >
                {item.duration === undefined ? t('no-take.label') : formatSeconds(item.duration)}
              </span>
              {columns.desired && (
                <span className='w-12 shrink-0 text-end font-mono text-xs text-fg-subtle'>
                  {item.desired === undefined ? '' : formatSeconds(item.desired)}
                </span>
              )}
              {renderActions?.(item)}
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

RecordingList.displayName = 'RecordingList';
