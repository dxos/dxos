//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { keySymbols } from '@dxos/keyboard';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

const DEFAULT_SHORTCUT = 'Alt+Space';

/** Modifier key names as reported by KeyboardEvent.key. */
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'Super']);

/** Converts a KeyboardEvent into a Tauri accelerator string, e.g. "Meta+K". */
const eventToAccelerator = (event: KeyboardEvent): string | null => {
  const mods: string[] = [];
  if (event.ctrlKey) {
    mods.push('Ctrl');
  }
  if (event.altKey) {
    mods.push('Alt');
  }
  if (event.shiftKey) {
    mods.push('Shift');
  }
  if (event.metaKey) {
    mods.push('Meta');
  }

  if (mods.length === 0) {
    return null;
  }
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  const keyName = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  return [...mods, keyName].join('+');
};

export type ShortcutInputProps = {
  shortcut: string | undefined;
  onChange: (shortcut: string) => void;
};

export const ShortcutInput = ({ shortcut, onChange }: ShortcutInputProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [recording, setRecording] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);

  const displayed = shortcut ?? DEFAULT_SHORTCUT;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecording(false);
        setPartial(null);
        return;
      }

      if (MODIFIER_KEYS.has(event.key)) {
        // Show partial modifier-only preview while user holds modifiers.
        const mods: string[] = [];
        if (event.ctrlKey) {
          mods.push('Ctrl');
        }
        if (event.altKey) {
          mods.push('Alt');
        }
        if (event.shiftKey) {
          mods.push('Shift');
        }
        if (event.metaKey) {
          mods.push('Meta');
        }
        setPartial(mods.join('+'));
        return;
      }

      const accelerator = eventToAccelerator(event);
      if (!accelerator) {
        return;
      }

      setRecording(false);
      setPartial(null);
      onChange(accelerator);
    },
    [onChange],
  );

  useEffect(() => {
    if (!recording) {
      return;
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, handleKeyDown]);

  const previewChord = partial ?? displayed;
  const chips = keySymbols(previewChord);

  return (
    <div className='flex items-center gap-2'>
      <span className='flex gap-1'>
        {chips.map((chip, index) => (
          <kbd
            key={index}
            className='inline-flex h-6 min-w-6 items-center justify-center rounded border border-separator px-1 font-mono text-xs text-description'
          >
            {chip}
          </kbd>
        ))}
      </span>
      <Button
        variant={recording ? 'ghost' : 'default'}
        onClick={() => {
          if (recording) {
            setRecording(false);
            setPartial(null);
          } else {
            setRecording(true);
          }
        }}
      >
        {recording ? t('settings.spotlight.recording.label') : t('settings.spotlight.record.label')}
      </Button>
    </div>
  );
};
