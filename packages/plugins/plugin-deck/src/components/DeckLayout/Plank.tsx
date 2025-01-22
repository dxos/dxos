//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import {
  createIntent,
  indexInPart,
  LayoutAction,
  partLength,
  Surface,
  useIntentDispatcher,
  type Layout,
  type LayoutCoordinate,
  type LayoutEntry,
  type LayoutPart,
  type LayoutParts,
} from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { useGraph } from '@dxos/plugin-graph';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError, PlankError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useMainSize } from '../../hooks';
import { DeckAction } from '../../types';
import { useDeckContext } from '../DeckContext';
import { useLayout } from '../LayoutContext';

const UNKNOWN_ID = 'unknown_id';

export type PlankProps = {
  entry?: LayoutEntry;
  layoutParts: LayoutParts;
  // TODO(wittjosiah): Remove. Pass in LayoutCoordinate instead of LayoutEntry.
  part: LayoutPart;
  layoutMode: Layout['layoutMode'];
  order?: number;
};

export const Plank = memo(({ entry, layoutParts, part, layoutMode, order }: PlankProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const coordinate: LayoutCoordinate = useMemo(() => ({ part, entryId: entry?.id ?? UNKNOWN_ID }), [entry?.id, part]);
  const { popoverAnchorId, scrollIntoView } = useLayout();
  const { plankSizing } = useDeckContext();
  const { graph } = useGraph();
  const node = useNode(graph, entry?.id);
  const rootElement = useRef<HTMLDivElement | null>(null);
  const canResize = layoutMode === 'deck';
  const Root = part === 'solo' ? 'article' : StackItem.Root;

  const attendableAttrs = useAttendableAttributes(coordinate.entryId);
  const index = indexInPart(layoutParts, coordinate);
  const length = partLength(layoutParts, part);
  const canIncrementStart = part === 'main' && index !== undefined && index > 0 && length !== undefined && length > 1;
  const canIncrementEnd = part === 'main' && index !== undefined && index < length - 1 && length !== undefined;

  const size = plankSizing?.[coordinate.entryId] as number | undefined;
  const setSize = useCallback(
    debounce((nextSize: number) => {
      return dispatch(createIntent(DeckAction.UpdatePlankSize, { id: coordinate.entryId, size: nextSize }));
    }, 200),
    [dispatch, coordinate.entryId],
  );

  // TODO(thure): Tabster’s focus group should handle moving focus to Main, but something is blocking it.
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target === event.currentTarget && event.key === 'Escape') {
      rootElement.current?.closest('main')?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    if (scrollIntoView === coordinate.entryId) {
      // TODO(wittjosiah): When focused on page load, the focus is always visible.
      //   Forcing focus to something smaller than the plank prevents large focus ring in the interim.
      const focusable = rootElement.current?.querySelector('button') || rootElement.current;
      focusable?.focus({ preventScroll: true });
      layoutMode === 'deck' && focusable?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      // Clear the scroll into view state once it has been actioned.
      void dispatch(createIntent(LayoutAction.ScrollIntoView, { id: undefined }));
    }
  }, [coordinate.entryId, scrollIntoView, layoutMode]);

  const isSolo = layoutMode === 'solo' && part === 'solo';
  const isAttendable = isSolo || (layoutMode === 'deck' && part === 'main');

  const sizeAttrs = useMainSize();

  const data = useMemo(
    () =>
      node && {
        subject: node.data,
        path: entry?.path,
        coordinate,
        popoverAnchorId,
      },
    [node, node?.data, entry?.path, coordinate, popoverAnchorId],
  );

  // TODO(wittjosiah): Change prop to accept a component.
  const placeholder = useMemo(() => <PlankLoading />, []);

  const className = mx(
    'attention-surface relative',
    isSolo && mainIntrinsicSize,
    isSolo && railGridHorizontal,
    isSolo ? 'grid absolute inset-0' : '!border-separator border-li',
  );

  return (
    <Root
      ref={rootElement}
      data-testid='deck.plank'
      tabIndex={0}
      {...(part === 'solo'
        ? ({ ...sizeAttrs, className } as any)
        : {
            item: { id: entry?.id ?? 'never' },
            size,
            onSizeChange: setSize,
            classNames: className,
            order,
            role: 'article',
          })}
      {...(isAttendable ? attendableAttrs : {})}
      onKeyDown={handleKeyDown}
    >
      {node ? (
        <>
          <NodePlankHeading
            coordinate={coordinate}
            node={node}
            canIncrementStart={canIncrementStart}
            canIncrementEnd={canIncrementEnd}
            popoverAnchorId={popoverAnchorId}
          />
          <Surface
            key={node.id}
            role='article'
            data={data}
            limit={1}
            fallback={PlankContentError}
            placeholder={placeholder}
          />
        </>
      ) : (
        <PlankError layoutCoordinate={coordinate} />
      )}
      {canResize && <StackItem.ResizeHandle />}
    </Root>
  );
});
