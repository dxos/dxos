//
// Copyright 2024 DXOS.org
//

import type { Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/react-client/echo';
import type { ThreadProps } from '@dxos/react-ui-thread';

/**
 * Props for components which connect an ECHO Thread object to the UI component Thread.
 * @param space - the containing Space entity
 * @param thread - the Thread entity
 * @param detached - whether this thread is detached from the object
 * @param currentRelatedId - an entity’s id that this thread is related to
 * @param current - whether this thread is current (wrt ARIA) in the app
 * @param autoFocusTextBox - whether to set `autoFocus` on the thread’s textbox
 * @param onAttend - combined callback for `onClickCapture` and `onFocusCapture` within the thread
 * @param onDelete - callback for deleting the thread
 */
export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  currentRelatedId?: string;
  autoFocusTextBox?: boolean;
  detached?: boolean;
  onAttend?: () => void;
  onDelete?: () => void;
} & Pick<ThreadProps, 'current'>;
