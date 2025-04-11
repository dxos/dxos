//
// Copyright 2024 DXOS.org
//

import React, {
  Fragment,
  type KeyboardEvent,
  memo,
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import {
  createIntent,
  LayoutAction,
  Surface,
  useCapability,
  useAppGraph,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError, PlankError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { DeckCapabilities } from '../../capabilities';
import { useNode, useMainSize } from '../../hooks';
import { DeckAction, type LayoutMode, type Part, type ResolvedPart, surfaceVariantSeparator } from '../../types';

const UNKNOWN_ID = 'unknown_id';

export type PlankProps = {
  id?: string;
  companionId?: string;
  part: Part;
  path?: string[];
  order?: number;
  active?: string[];
  layoutMode: LayoutMode;
};

type PlankImplProps = Omit<PlankProps, 'companionId' | 'part'> & {
  part: ResolvedPart;
  surfaceVariant?: string;
  companioned?: 'primary' | 'companion';
  primaryId?: string;
};

const PlankImpl = memo(
  ({
    id = UNKNOWN_ID,
    part,
    path,
    order,
    active,
    layoutMode,
    surfaceVariant,
    companioned,
    primaryId,
  }: PlankImplProps) => {
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const { deck, popoverAnchorId, scrollIntoView } = useCapability(DeckCapabilities.DeckState);
    const { graph } = useAppGraph();
    const node = useNode(graph, id);
    const rootElement = useRef<HTMLDivElement | null>(null);
    const canResize = layoutMode === 'deck';
    const Root = part.startsWith('solo') ? 'article' : StackItem.Root;

    const attendableAttrs = useAttendableAttributes(id);
    const index = active ? active.findIndex((entryId) => entryId === id) : 0;
    const length = active?.length ?? 1;
    const canIncrementStart = active && index !== undefined && index > 0 && length !== undefined && length > 1;
    const canIncrementEnd = active && index !== undefined && index < length - 1 && length !== undefined;

    const sizeKey = `${id.split('+')[0]}${surfaceVariant ? `${surfaceVariantSeparator}${surfaceVariant}` : ''}`;
    const size = deck.plankSizing[sizeKey] as number | undefined;
    const setSize = useCallback(
      debounce((nextSize: number) => {
        return dispatch(createIntent(DeckAction.UpdatePlankSize, { id: sizeKey, size: nextSize }));
      }, 200),
      [dispatch, sizeKey],
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
    const isAttendable =
      (layoutMode === 'solo' && part.startsWith('solo')) || (layoutMode === 'deck' && part === 'deck');

    const sizeAttrs = useMainSize();

    const data = useMemo(
      () =>
        node && {
          subject: node.data,
          variant: surfaceVariant,
          path,
          popoverAnchorId,
        },
      [node, node?.data, path, popoverAnchorId, surfaceVariant],
    );

    // TODO(wittjosiah): Change prop to accept a component.
    const placeholder = useMemo(() => <PlankLoading />, []);

    const className = mx(
      'attention-surface relative',
      isSolo && mainIntrinsicSize,
      isSolo && railGridHorizontal,
      isSolo && 'absolute inset-0',
      part.startsWith('solo') && 'grid',
      part === 'deck' && (companioned === 'companion' ? '!border-separator border-ie' : '!border-separator border-li'),
      part.startsWith('solo-') && 'row-span-2 grid-rows-subgrid min-is-0',
      part === 'solo-companion' && '!border-separator border-is',
    );

    return (
      <Root
        ref={rootElement}
        data-testid='deck.plank'
        tabIndex={0}
        {...(part.startsWith('solo')
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
              part={part.startsWith('solo-') ? 'solo' : part}
              node={node}
              canIncrementStart={canIncrementStart}
              canIncrementEnd={canIncrementEnd}
              popoverAnchorId={popoverAnchorId}
              companioned={companioned}
              primaryId={primaryId}
              surfaceVariant={surfaceVariant}
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
  },
);

const SplitFrame = ({ children }: PropsWithChildren<{}>) => {
  const sizeAttrs = useMainSize();
  return (
    <div
      role='none'
      className={mx('grid grid-cols-[1fr_1fr] absolute inset-0', railGridHorizontal, mainIntrinsicSize)}
      {...sizeAttrs}
    >
      {children}
    </div>
  );
};

export const Plank = (props: PlankProps) => {
  if (props.companionId) {
    const Root = props.part === 'solo' ? SplitFrame : Fragment;
    return (
      <Root>
        <PlankImpl {...props} {...(props.part === 'solo' ? { part: 'solo-primary' } : {})} companioned='primary' />
        <PlankImpl
          {...props}
          {...(props.companionId.startsWith(surfaceVariantSeparator)
            ? { surfaceVariant: props.companionId.substring(2) }
            : { id: props.companionId, primaryId: props.id })}
          {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: props.order! + 1 })}
          companioned='companion'
        />
      </Root>
    );
  } else {
    return <PlankImpl {...props} />;
  }
};
