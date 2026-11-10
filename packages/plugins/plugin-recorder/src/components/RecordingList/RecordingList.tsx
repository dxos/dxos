//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { mx } from '@dxos/ui-theme';

import { RecorderNamespace } from '../../namespace.ts';

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
  /** Secondary column: a slide's take count, or why a take is not saved. */
  description?: string;
  /** Length of the take (a slide's main take), in seconds; undefined when there is none. */
  duration?: number;
  /** The slide's desired length, in seconds. */
  desired?: number;
  /** The slide's main take (or, for a slide, that it has one). */
  main?: boolean;
  /** The take is not saved yet. */
  error?: boolean;
};

/** A button in a row's trailing cells. */
export type RecordingAction = {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export type RecordingListProps<T extends RecordingItem = RecordingItem> = {
  items: T[];
  /** The current (selected) row, which the status bar's player plays; the arrow keys and a click move it. */
  value?: string;
  onValueChange?: (id: string) => void;
  /** Accessible name of the list. */
  label: string;
  /** Shows each row's main mark (a circle, a green check circle when main) as a read-only status. */
  marks?: boolean;
  /** Makes each row's main mark a toggle that marks it main. */
  onMain?: (item: T) => void;
  /** Space on the current row plays or stops it. */
  onToggle?: (item: T) => void;
  /** Double-clicking a row opens what it stands for (a slide). */
  onOpen?: (item: T) => void;
  /** The buttons at the end of each row, one block-sized cell each; every row has the same count. */
  actions?: (item: T) => RecordingAction[];
};

/**
 * The rows of a Recordings companion: a slide's takes, or a presentation's slides, as a list with columns (check,
 * label, count, length, desired length, then one block-sized cell per button) on Listbox's shared tracks, so cells
 * line up from row to row and the leading check and trailing buttons line up with the toolbar's. The current row is the
 * selection: a click anywhere in a row selects it, the arrow keys move it, Space plays or stops it, and a double-click
 * opens it.
 */
export const RecordingList = <T extends RecordingItem>({
  items,
  value,
  onValueChange,
  label,
  marks,
  onMain,
  onToggle,
  onOpen,
  actions,
}: RecordingListProps<T>) => {
  const { t } = Hooks.useTranslation(RecorderNamespace.key);
  const keyboard = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => items.map((item) => ({ value: item.id, label: item.title })), [items]);
  // The leading cell holds the main-take check (or an unsaved take's warning); a list with neither has none.
  const leading = marks || !!onMain || items.some((item) => item.error);
  const description = items.some((item) => item.description);
  const desired = items.some((item) => item.desired !== undefined);
  const actionCount = items[0] && actions ? actions(items[0]).length : 0;
  const columns = [
    leading && 'var(--dx-block-size)',
    'minmax(0, 1fr)',
    description && 'auto',
    'auto',
    desired && 'auto',
    ...Array.from({ length: actionCount }, () => 'var(--dx-block-size)'),
  ]
    .filter(Boolean)
    .join(' ');
  const current = items.find((item) => item.id === value);

  return (
    <Listbox.Root
      items={options}
      columns={columns}
      value={value ?? ''}
      onValueChange={(id) => id && onValueChange?.(id)}
      // A keyboard move selects, while a pointer only highlights the rows it passes.
      onHighlightChange={(id) => {
        if (keyboard.current && id) {
          onValueChange?.(id);
        }
      }}
    >
      <Listbox.Viewport>
        {/* No gutter: the leading and trailing icon cells then sit under the toolbar's first and last buttons. */}
        <Listbox.Content
          ref={contentRef}
          gutter='none'
          aria-label={label}
          data-testid='recorder.list'
          onKeyDownCapture={(event) => {
            keyboard.current = true;
            if (event.key === ' ' && current && onToggle) {
              event.preventDefault();
              event.stopPropagation();
              onToggle(current);
            }
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
                // As tall as the toolbar, so the list reads at the toolbar's rhythm.
                classNames='min-h-(--dx-toolbar-size)'
                // A row's controls keep their presses from the list, so a press on one selects its row here.
                onClickCapture={() => item.id !== value && onValueChange?.(item.id)}
                // The list keeps the keyboard after a press on a row's button, so the arrows go on from this row.
                onClick={() => contentRef.current?.focus({ preventScroll: true })}
                onDoubleClick={onOpen && (() => onOpen(item))}
              >
                {leading && (
                  <Listbox.ItemIcon>
                    {item.error ? (
                      <Icon.Icon icon='ph--warning--regular' classNames='text-error-text' />
                    ) : onMain ? (
                      <SystemButton.Check
                        data-testid='recorder.item.main'
                        iconOnly
                        variant='ghost'
                        label={t(item.main ? 'main-take.label' : 'select-take.label')}
                        pressed={!!item.main}
                        onPressedChange={(pressed) => pressed && onMain(item)}
                      />
                    ) : (
                      marks && (
                        <Icon.Icon
                          data-testid='recorder.item.mark'
                          icon={item.main ? 'ph--check-circle--fill' : 'ph--circle--regular'}
                          classNames={mx(item.main ? 'text-success-text' : 'text-fg-subtle')}
                        />
                      )
                    )}
                  </Listbox.ItemIcon>
                )}
                <Listbox.ItemText classNames='tabular-nums'>{item.title}</Listbox.ItemText>
                {/* Each text column pads both sides, so neighbouring values never run together. */}
                {description && (
                  <span
                    className={mx('truncate px-2 text-end text-xs', item.error ? 'text-error-text' : 'text-fg-subtle')}
                    title={item.description}
                  >
                    {item.description}
                  </span>
                )}
                <span
                  data-over={over ? 'true' : undefined}
                  className={mx('px-2 text-end font-mono text-xs', over ? 'text-error-text' : 'text-fg-muted')}
                >
                  {item.duration === undefined ? '' : formatSeconds(item.duration)}
                </span>
                {desired && (
                  <span className='px-2 text-end font-mono text-xs text-fg-muted'>
                    {item.desired === undefined ? '' : formatSeconds(item.desired)}
                  </span>
                )}
                {actions?.(item).map((action) => (
                  <Listbox.ItemIcon key={action.id}>
                    <Button.Root
                      data-testid={`recorder.item.${action.id}`}
                      icon={action.icon}
                      iconOnly
                      variant='ghost'
                      disabled={action.disabled}
                      label={action.label}
                      onClick={action.onClick}
                    />
                  </Listbox.ItemIcon>
                ))}
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

RecordingList.displayName = 'RecordingList';
