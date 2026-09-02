//
// Copyright 2026 DXOS.org
//

import { Task } from '@dxos/types';

/** One glyph per status, shared by the flat row and the tree so the two cannot drift apart. */
export const STATUS_ICONS: Record<Task.Status, { icon: string; classNames?: string }> = {
  backlog: { icon: 'ph--tray--regular', classNames: 'text-subdued' },
  todo: { icon: 'ph--square--regular', classNames: 'text-subdued' },
  blocked: { icon: 'ph--prohibit--regular', classNames: 'text-warning-text' },
  started: { icon: 'ph--hourglass--regular', classNames: 'text-info-text' },
  review: { icon: 'ph--eye--regular', classNames: 'text-info-text' },
  done: { icon: 'ph--check--regular', classNames: 'text-success-text' },
  failed: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  cancelled: { icon: 'ph--x--regular', classNames: 'text-error-text' },
  duplicate: { icon: 'ph--copy--regular', classNames: 'text-subdued' },
};
