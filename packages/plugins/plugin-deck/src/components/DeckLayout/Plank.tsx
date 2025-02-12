//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { createIntent, LayoutAction, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { useGraph } from '@dxos/plugin-graph';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/react-ui-theme';

import { NodePlankHeading, type NodePlankHeadingProps } from './NodePlankHeading';
import { PlankContentError, PlankError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useMainSize } from '../../hooks';
import { DeckAction, type LayoutMode } from '../../types';
import { useLayout } from '../LayoutContext';

const UNKNOWN_ID = 'unknown_id';

export type PlankProps = {
  id?: string;
  part: NodePlankHeadingProps['part'];
  path?: string[];
  order?: number;
  deck?: string[];
  layoutMode: LayoutMode;
};

export const Plank = memo(({ id = UNKNOWN_ID, part, path, order, deck, layoutMode }: PlankProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { plankSizing, popoverAnchorId, scrollIntoView } = useLayout();
  const { graph } = useGraph();
  const node = useNode(graph, id);
  const rootElement = useRef<HTMLDivElement | null>(null);
  const canResize = layoutMode === 'deck';
  const Root = part === 'solo' ? 'article' : StackItem.Root;

  const attendableAttrs = useAttendableAttributes(id);
  const index = deck ? deck.findIndex((entryId) => entryId === id) : 0;
  const length = deck?.length ?? 1;
  const canIncrementStart = deck && index !== undefined && index > 0 && length !== undefined && length > 1;
  const canIncrementEnd = deck && index !== undefined && index < length - 1 && length !== undefined;

  const size = plankSizing?.[id] as number | undefined;
  const setSize = useCallback(
    debounce((nextSize: number) => {
      return dispatch(createIntent(DeckAction.UpdatePlankSize, { id, size: nextSize }));
    }, 200),
    [dispatch, id],
  );

  // TODO(thure): Tabster’s focus group should handle moving focus to Main, but something is blocking it.
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target === event.currentTarget && event.key === 'Escape') {
      rootElement.current?.closest('main')?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    if (scrollIntoView === id) {
      // TODO(wittjosiah): When focused on page load, the focus is always visible.
      //   Forcing focus to something smaller than the plank prevents large focus ring in the interim.
      const focusable = rootElement.current?.querySelector('button') || rootElement.current;
      focusable?.focus({ preventScroll: true });
      layoutMode === 'deck' && focusable?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      // Clear the scroll into view state once it has been actioned.
      void dispatch(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: undefined }));
    }
  }, [id, scrollIntoView, layoutMode]);

  const isSolo = layoutMode === 'solo' && part === 'solo';
  const isAttendable = isSolo || (layoutMode === 'deck' && part === 'deck');

  const sizeAttrs = useMainSize();

  const data = useMemo(
    () =>
      node && {
        subject: node.data,
        path,
        popoverAnchorId,
      },
    [node, node?.data, path, popoverAnchorId],
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
            item: { id },
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
            id={id}
            part={part}
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
        <PlankError id={id} part={part} />
      )}
      {canResize && <StackItem.ResizeHandle />}
    </Root>
  );
});
