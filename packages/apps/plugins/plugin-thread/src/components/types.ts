//
// Copyright 2024 DXOS.org
//

import type { Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/react-client/echo';
import type { ThreadProps } from '@dxos/react-ui-thread';

export type ThreadContainerProps = {
  space: Space;
  thread: ThreadType;
  currentRelatedId?: string;
  autoFocusTextBox?: boolean;
  detached?: boolean;
  onAttend?: () => void;
  onDelete?: () => void;
} & Pick<ThreadProps, 'current'>;
