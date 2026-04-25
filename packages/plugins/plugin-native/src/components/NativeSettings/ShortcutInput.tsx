//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { keySymbols } from '@dxos/keyboard';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

const KEY_CHIP = mx(
  'inline-flex min-w-[24px] h-[24px] px-1 justify-center items-center text-xs',
  'rounded-sm bg-neutral-100 dark:bg-neutral-900',
);

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/** Build a normalized shortcut string from a keydown event. Returns `null` if only modifier keys are held. */
const buildShortcut = (event: KeyboardEvent): string | null => {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  if (event.metaKey) parts.push('Meta');

  // Normalize the natural key. Use ` ` → `Space`, single letters uppercased.
  let key = event.key;
  if (key === ' ') {
    key = 'Space';
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }
  parts.push(key);
  return parts.join('+');
};

export type ShortcutInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Whether at least one non-modifier key is required. Defaults to true so the shortcut is actually triggerable. */
  requireNonModifierKey?: boolean;
};

/**
 * A keyboard-shortcut input that lets the user enter a "capture" mode,
 * press a key combination, then commits the value.
 *
 * Capture starts when the field is focused or the user clicks "Record".
 * Press Enter to commit, Escape to cancel.
 */
export const ShortcutInput = ({ value, onChange, requireNonModifierKey = true }: ShortcutInputProps) => {
  const { t } = useTranslation(meta.id);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const stopRecording = useCallback(
    (commit: boolean) => {
      setRecording(false);
      if (commit && draft) {
        onChange(draft);
      }
      setDraft(null);
    },
    [draft, onChange],
  );

  // Cancel on outside click.
  useEffect(() => {
    if (!recording) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setRecording(false);
        setDraft(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [recording]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!recording) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRecording(true);
          setDraft(null);
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        stopRecording(false);
        return;
      }

      if (event.key === 'Enter' && draft) {
        stopRecording(true);
        return;
      }

      const next = buildShortcut(event);
      if (!next) {
        // Only modifier(s) held; show partial preview.
        const parts: string[] = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');
        setDraft(parts.length ? parts.join('+') + '+…' : null);
        return;
      }

      setDraft(next);
      // Commit immediately if a non-modifier key was pressed and modifiers are present (or not required).
      const hasModifier = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
      if (!requireNonModifierKey || hasModifier) {
        // Auto-commit on first complete chord; user can still re-record by focusing again.
        onChange(next);
        setRecording(false);
        setDraft(null);
      }
    },
    [recording, draft, requireNonModifierKey, onChange, stopRecording],
  );

  const display = draft ?? value;
  const symbols = display ? keySymbols(display.replace(/\+…$/, '')) : [];
  const trailingEllipsis = display?.endsWith('+…');

  return (
    <div className='flex items-center gap-2 justify-end'>
      <div
        ref={fieldRef}
        role='textbox'
        tabIndex={0}
        aria-label={t('settings.spotlight-shortcut.label')}
        aria-live='polite'
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (recording) {
            setRecording(false);
            setDraft(null);
          }
        }}
        className={mx(
          'inline-flex items-center gap-1 min-w-[8rem] px-2 py-1 rounded-sm border cursor-text',
          recording ? 'border-accentSurface ring-2 ring-accentSurface/40' : 'border-separator',
        )}
      >
        {symbols.length > 0 ? (
          symbols.map((symbol, index) => (
            <span key={index} className={KEY_CHIP}>
              {symbol}
            </span>
          ))
        ) : (
          <span className='text-description text-xs'>{t('settings.spotlight-shortcut.placeholder')}</span>
        )}
        {trailingEllipsis && <span className='text-description text-xs'>…</span>}
      </div>
      <Button
        variant='ghost'
        density='fine'
        onClick={() => {
          if (recording) {
            stopRecording(false);
          } else {
            setRecording(true);
            setDraft(null);
            fieldRef.current?.focus();
          }
        }}
      >
        <Icon icon={recording ? 'ph--x--regular' : 'ph--record--regular'} size={4} />
        <span className='ml-1'>
          {recording ? t('settings.spotlight-shortcut.cancel.label') : t('settings.spotlight-shortcut.record.label')}
        </span>
      </Button>
    </div>
  );
};
