//
// Copyright 2024 DXOS.org
//

import { type AnyLiveObject } from '@dxos/client/echo';
import { type ThreadType } from '@dxos/plugin-space/types';
import { type ThreadProps } from '@dxos/react-ui-thread';

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
  context?: AnyLiveObject<any>;
  autoFocusTextbox?: boolean;
  onTextboxFocus?: () => void;
  detached?: boolean;
  onAttend?: (thread: ThreadType) => void;
  onComment?: (thread: ThreadType, message: string) => void;
  onResolve?: (thread: ThreadType) => void;
  onMessageDelete?: (thread: ThreadType, messageId: string) => void;
  onThreadDelete?: (thread: ThreadType) => void;
} & Pick<ThreadProps, 'current'>;
