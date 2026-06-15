//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useMemo } from 'react';

import { type Event } from '@dxos/async';
import { isTruthy } from '@dxos/util';

import { type ChatEvent } from '../components/Chat/events';

/**
 * CodeMirror keymap shared by the chat document (Thread) and the prompt editor — pressing
 * Mod-Arrow keys when either editor is focused emits the corresponding `ChatEvent` on the
 * shared event bus.
 */
export const useChatKeymapExtensions = ({ event }: { event: Event<ChatEvent> }): Extension[] => {
  return useMemo<Extension[]>(() => {
    return [
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-ArrowUp',
            preventDefault: true,
            run: () => {
              event.emit({ type: 'nav-previous' });
              return true;
            },
            shift: () => {
              event.emit({ type: 'thread-open' });
              return true;
            },
          },
          {
            key: 'Mod-ArrowDown',
            preventDefault: true,
            run: () => {
              event.emit({ type: 'nav-next' });
              return true;
            },
            shift: () => {
              event.emit({ type: 'thread-close' });
              return true;
            },
          },
        ]),
      ),
    ].filter(isTruthy);
  }, [event]);
};
