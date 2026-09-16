//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * The main `ChatRoot` manages the `ChatContextValue` which contains an `event` property that subcomponents
 * can subscribe to and submit events. Unhandled events are passed to the external `onEvent` callback.
 */
export type ChatEvent =
  | {
      type: 'toggle-debug';
    }
  //
  // Thread
  //
  | {
      type: 'submit';
      text: string;
    }
  /**
   * System-generated turn content — an inline flow (a connector authorized, a plugin enabled)
   * reporting itself. Submitted as a synthetic block, so it reads as a system note rather than as
   * words the user typed.
   */
  | {
      type: 'report';
      text: string;
    }
  | {
      type: 'retry';
    }
  | {
      type: 'cancel';
    }
  | {
      type: 'delete';
      id: string;
    }
  /** Soft-fork the thread: continue from this message, leaving what followed it unreachable. */
  | {
      type: 'rewind';
      id: string;
    }
  | {
      type: 'add';
      object: Obj.Unknown;
    }
  //
  // Errors
  //
  | {
      type: 'error';
      error: Error;
    }
  //
  // UX
  //
  | {
      type: 'update-prompt';
      text: string;
    }
  | {
      type: 'scroll-to-bottom';
    }
  | {
      type: 'nav-previous';
    }
  | {
      type: 'nav-next';
    }
  | {
      type: 'thread-open';
    }
  | {
      type: 'thread-close';
    }
  /** Show or hide the checklist beside the prompt. */
  | {
      type: 'toggle-tasks';
    };
