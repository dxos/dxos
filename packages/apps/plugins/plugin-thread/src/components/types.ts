//
// Copyright 2024 DXOS.org
//

import { type ThreadType } from '@braneframe/types';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import type { ThreadProps } from '@dxos/react-ui-thread';

/**
 * Props for components which connect an ECHO Thread object to the UI component Thread.
 * @param space - the containing Space entity
 * @param thread - the Thread entity
 * @param context - current application context
 * @param current - whether this thread is current (wrt ARIA) in the app
 * @param autoFocusTextbox - whether to set `autoFocus` on the thread’s textbox
 * @param onTextboxFocus - a callback for when the textbox is focused
 * @param detached - whether this thread is detached from the object
 * @param onAttend - combined callback for `onClickCapture` and `onFocusCapture` within the thread
 * @param onDelete - callback for deleting the thread
 */
export type ThreadContainerProps = {
  thread: ThreadType;
  context?: EchoReactiveObject<any>;
  autoFocusTextbox?: boolean;
  onTextboxFocus?: () => void;
  detached?: boolean;
  onAttend?: () => void;
  onDelete?: () => void;
} & Pick<ThreadProps, 'current'>;
