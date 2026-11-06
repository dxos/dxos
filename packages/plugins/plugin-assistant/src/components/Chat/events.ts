//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

export type ChatDrawer = 'tasks' | 'context';

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
  /** Fork the conversation at this answer: a thread of its own that stays apart from main. */
  | {
      type: 'fork';
      id: string;
    }
  /** Show a fork in place of main; the host owns which thread its chat model shows. */
  | {
      type: 'open-fork';
      thread: string;
    }
  /** Withdraw a prompt the agent has not taken up (its delivery row's remove). */
  | {
      type: 'remove-prompt';
      id: string;
    }
  /** A person answered a request an agent raised (allow or refuse a tool call). */
  | {
      type: 'respond';
      messageId: string;
      requestId: string;
      optionId: string;
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
  /** Put the cursor in the prompt. */
  | {
      type: 'focus-prompt';
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
  /** Open one of the drawers above the prompt, or close the one that is open. */
  | {
      type: 'set-drawer';
      drawer?: ChatDrawer;
    };
