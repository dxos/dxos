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
  | {
      type: 'add';
      object: Obj.Any;
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
  | {
      type: 'record-start';
    }
  | {
      type: 'record-stop';
    };
