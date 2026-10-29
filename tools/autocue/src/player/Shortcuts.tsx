//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useEffect } from 'react';

import * as Dialog from '@dxos/react-ui/Dialog';
import * as Layout from '@dxos/react-ui/Layout';

import { type Playback } from './usePlayback.ts';

export const SHORTCUTS: [keys: string[], action: string][] = [
  [['Space', 'K'], 'Play or pause'],
  [['S'], 'Stop and go back to the start'],
  [['<-', '->'], 'Previous or next chapter (or spec step)'],
  [['1-9'], 'Jump to chapter 1-9'],
  [['Shift <-', 'Shift ->'], 'Back or forward 5 seconds'],
  [['[', ']'], 'Previous or next demo'],
  [['<', '>'], 'Slower or faster'],
  [['0'], 'Normal speed'],
  [['^', 'v'], 'Volume up or down'],
  [['M'], 'Mute or unmute'],
  [['F'], 'Fullscreen'],
  [['V'], 'Next side panel tab'],
  [['C'], 'Copy the agent prompt'],
  [['?'], 'Show this list'],
];

const Key = ({ children }: { children: string }) => (
  <kbd className='rounded-xs border border-separator bg-input-surface px-1.5 font-mono text-xs'>{children}</kbd>
);

export const Shortcuts = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog.Root open={open} onOpenChange={(details) => onOpenChange(details.open)}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Keyboard shortcuts</Dialog.Title>
        <Dialog.CloseTrigger />
      </Dialog.Header>
      <Dialog.Body>
        <Layout.Grid cols={['max', 'fill']} gap='sm' align='center' grow={false}>
          {SHORTCUTS.map(([keys, action]) => (
            <Fragment key={action}>
              <Layout.Flex gap='xs'>
                {keys.map((key) => (
                  <Key key={key}>{key}</Key>
                ))}
              </Layout.Flex>
              <span>{action}</span>
            </Fragment>
          ))}
        </Layout.Grid>
      </Dialog.Body>
    </Dialog.Content>
  </Dialog.Root>
);

export type KeyboardActions = {
  playback: Playback;
  previousDemo: () => void;
  nextDemo: () => void;
  nextView: () => void;
  copyPrompt: () => void;
  fullscreen: () => void;
  showHelp: () => void;
  /** Keys go to the dialog while it is open. */
  disabled: boolean;
};

/** The player's keys, on the document so they work wherever focus is, except in a text field. */
export const useKeyboard = (actions: KeyboardActions) => {
  useEffect(() => {
    if (actions.disabled) {
      return;
    }
    const { playback } = actions;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      // A focused Listbox, ToggleGroup or Slider owns the arrow keys for its own navigation.
      const ownsArrows =
        target instanceof HTMLElement && !!target.closest('[role=listbox],[role=radiogroup],[role=slider]');
      const map: Record<string, () => void> = {
        ' ': playback.toggle,
        'k': playback.toggle,
        's': playback.stop,
        'ArrowLeft': () => (event.shiftKey ? playback.seek(playback.time - 5) : playback.stepChapter(-1)),
        'ArrowRight': () => (event.shiftKey ? playback.seek(playback.time + 5) : playback.stepChapter(1)),
        'ArrowUp': () => playback.setVolume((playback.muted ? 0 : playback.volume) + 0.1),
        'ArrowDown': () => playback.setVolume(playback.volume - 0.1),
        'm': playback.toggleMute,
        '[': actions.previousDemo,
        ']': actions.nextDemo,
        '<': () => playback.stepRate(-1),
        ',': () => playback.stepRate(-1),
        '>': () => playback.stepRate(1),
        '.': () => playback.stepRate(1),
        '0': () => playback.setRate(1),
        'f': actions.fullscreen,
        'v': actions.nextView,
        'c': actions.copyPrompt,
        '?': actions.showHelp,
      };
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (ownsArrows && key.startsWith('Arrow')) {
        return;
      }
      // A focused button already answers Space and Enter itself.
      if (key === ' ' && target instanceof HTMLButtonElement) {
        return;
      }
      // A held key repeats; only stepping and volume should, or holding Space would toggle play over and over.
      if (event.repeat && !key.startsWith('Arrow')) {
        return;
      }
      const action = /^[1-9]$/.test(key) ? () => playback.seekChapter(Number(key) - 1) : map[key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [actions]);
};
