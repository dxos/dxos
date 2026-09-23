//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { useMediaQuery } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';

import * as LayoutOperation from '../../operations/LayoutOperation.ts';

export type DetailNavigationOptions = {
  /**
   * The list's own plank: the attention context its selection is published in, the deck root a
   * levelled open is relative to, and the anchor a companion is attached to.
   */
  contextId: string;
  /** Path of the item's own node, which a plank opens. */
  getPath: (id: string) => string;
  /**
   * The rung of the root's deck chain a plank opens at. Opening at a level reuses that level's
   * plank, so reading down a list does not stack one plank per row.
   */
  level: string;
  /**
   * Companion variant to fill instead of opening a plank, where the host contributes one. A fixed
   * slot (one companion the list fills with whatever is current) or a function, for a host that
   * contributes one companion per item. Omitted, every activation opens a plank.
   */
  companion?: string | ((id: string) => string);
};

export type DetailActivation = {
  /** A modified activation asks for a plank of its own, leaving what is already open in place. */
  modified?: boolean;
};

/**
 * Opens the detail of a row in a list — the reading gesture shared by the mailbox, the calendar and
 * a project's task ledger.
 *
 * One activation does two things: it publishes the row as the list's selection (which is what keeps
 * the row current, and what a companion reads to know its subject), and it shows the detail. Where
 * the detail goes is the part that differs, and it is decided here rather than in each list:
 *
 * - a companion beside the list, when the host contributes one and the viewport has room for it, so
 *   reading an item never navigates over the list it came from;
 * - otherwise a plank at the host's `level`, which the deck reuses as the reader moves down the
 *   list — below `md` there is no room beside the plank, so that is the only form available;
 * - a modified (meta/ctrl) activation always opens a plank of its own, since a reader asking for one
 *   wants to keep what they were looking at.
 *
 * Passing `undefined` clears the selection: a list that reads its current row back from the host
 * would otherwise keep the last row highlighted with nothing open.
 */
export const useDetailNavigation = ({ contextId, getPath, level, companion }: DetailNavigationOptions) => {
  const { invokePromise } = useOperationInvoker();
  // `md` is the breakpoint the deck calls "not mobile": below it one plank fills the screen, so a
  // companion beside the list would be a pane the reader cannot see.
  const [isNotMobile] = useMediaQuery('md');

  return useCallback(
    (id: string | undefined, { modified = false }: DetailActivation = {}) => {
      if (!id) {
        void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single' } });
        return;
      }

      void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single', id } });

      if (companion && isNotMobile && !modified) {
        void invokePromise(LayoutOperation.UpdateCompanion, {
          subject: Attention.linkedSegment(typeof companion === 'function' ? companion(id) : companion),
          anchor: contextId,
        });
        return;
      }

      void invokePromise(LayoutOperation.Open, {
        subject: [getPath(id)],
        ...(modified ? {} : { root: contextId, level }),
        pivotId: contextId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [contextId, getPath, level, companion, isNotMobile, invokePromise],
  );
};
