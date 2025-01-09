//
// Copyright 2025 DXOS.org
//

import { openIds, type Layout, type LayoutParts } from '@dxos/app-framework';
import { type Capabilities } from '@dxos/app-framework/next';
import { type AttentionManager } from '@dxos/plugin-attention';

export type SetLocationOptions = {
  next: LayoutParts;
  location: Capabilities.MutableLocation;
  layout: Layout;
  attention?: AttentionManager;
};

export const setLocation = ({ next, location, layout, attention }: SetLocationOptions) => {
  const part = layout.layoutMode === 'solo' ? 'solo' : 'main';
  const ids = openIds(next, [part]);

  const current = openIds(location.active, [part]);
  const removed = current.filter((id) => !ids.includes(id));
  const closed = Array.from(new Set([...location.closed.filter((id) => !ids.includes(id)), ...removed]));

  location.closed = closed;
  location.active = next;

  if (attention) {
    const attended = attention.current;
    const [attendedId] = Array.from(attended);
    const isAttendedAvailable = !!attendedId && ids.includes(attendedId);
    if (!isAttendedAvailable) {
      const currentIds = location.active[part]?.map(({ id }) => id) ?? [];
      const attendedIndex = currentIds.indexOf(attendedId);
      // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
      const index = attendedIndex === -1 ? 0 : attendedIndex >= ids.length ? ids.length - 1 : attendedIndex;
      return next[part]?.[index].id;
    }
  }
};
