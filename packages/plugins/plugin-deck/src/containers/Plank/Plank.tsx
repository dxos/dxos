//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getCompanionVariant } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { debounce } from '@dxos/async';
import { type Node, useNode } from '@dxos/plugin-graph';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/ui-theme';

import { useCompanions, useDeckState, useMainSize, useSelectedCompanion } from '../../hooks';
import { type Settings, type LayoutMode, PLANK_COMPANION_TYPE, type ResolvedPart } from '../../types';
import { DeckOperation } from '../../operations';

import { PlankError, PlankErrorFallback } from './PlankError';
import { PlankHeading } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

const UNKNOWN_ID = 'unknown_id';

//
// Plank
//

export type PlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'path' | 'order' | 'active' | 'settings'> & {
  id?: string;
  companionVariant?: string;
};

/**
 * A Plank is the main container for surfaces within a Deck.
 * It may be paired with a companion plank that enables the user to select one of multiple companion surfaces.
 */
export const Plank = memo(({ id = UNKNOWN_ID, companionVariant, ...props }: PlankProps) => {
  // TODO(burdon): Pass in graph and node.
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const companions = useCompanions(id);
  const { companionId } = useSelectedCompanion(companions, companionVariant);
  const resolvedCompanionId = companionVariant ? companionId : undefined;
  const currentCompanion = companions.find(({ id }) => id === resolvedCompanionId);
  const hasCompanion = !!(resolvedCompanionId && currentCompanion);

  return (
    <PlankContainer
      solo={props.part === 'solo'}
      companion={hasCompanion}
      encapsulate={!!props.settings?.encapsulatedPlanks}
    >
      <PlankComponent
        id={id}
        node={node}
        companioned={hasCompanion ? 'primary' : undefined}
        companions={hasCompanion ? [] : companions}
        {...props}
        {...(props.part === 'solo' ? { part: 'solo-primary' } : {})}
      />
      {hasCompanion && (
        <PlankComponent
          id={resolvedCompanionId}
          node={currentCompanion}
          primary={node}
          companions={companions}
          companioned='companion'
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: (props.order ?? 0) + 1 })}
        />
      )}
    </PlankContainer>
  );
});

//
// PlankContainer
//

type PlankContainerProps = PropsWithChildren<{ solo: boolean; companion: boolean; encapsulate: boolean }>;

const PlankContainer = ({ children, solo, companion, encapsulate }: PlankContainerProps) => {
  const sizeAttrs = useMainSize();
  if (!solo) {
    return children;
  }

  return (
    <div
      role='none'
      data-popover-collision-boundary={true}
      className={mx(
        'absolute inset-(--main-spacing) grid',
        encapsulate && 'border border-separator rounded-sm overflow-hidden',
        companion && 'grid-cols-[6fr_4fr]', // TODO(burdon): Resize.
        railGridHorizontal,
        mainIntrinsicSize,
      )}
      {...sizeAttrs}
    >
      {children}
    </div>
  );
};

//
// PlankComponent
//

type PlankComponentProps = {
  layoutMode: LayoutMode;
  id: string;
  part: ResolvedPart;
  path?: string[];
  order?: number;
  active?: string[];
  companioned?: 'primary' | 'companion';
  node?: Node.Node;
  primary?: Node.Node;
  companions?: Node.Node[];
  settings?: Settings.Settings;
};

const PlankComponent = memo(
  ({
    layoutMode,
    id,
    part,
    path,
    order,
    active,
    companioned,
    node,
    primary,
    companions,
    settings,
  }: PlankComponentProps) => {
    const { invokePromise } = useOperationInvoker();
    const {
      deck,
      state: { popoverAnchorId, scrollIntoView },
    } = useDeckState();

    const canResize = layoutMode === 'deck';
    const { findFirstFocusable } = useFocusFinders();
    const attentionAttrs = useAttentionAttributes(primary?.id ?? id);
    const index = active ? active.findIndex((entryId) => entryId === id) : 0;
    const length = active?.length ?? 1;
    const canIncrementStart = active && index !== undefined && index > 0 && length !== undefined && length > 1;
    const canIncrementEnd = active && index !== undefined && index < length - 1 && length !== undefined;

    const rootElement = useRef<HTMLDivElement | null>(null);

    const variant = node?.type === PLANK_COMPANION_TYPE ? getCompanionVariant(id) : undefined;
    const sizeKey = id.split('+')[0];
    const size = deck.plankSizing[sizeKey] as number | undefined;

    const handleSizeChange = useCallback(
      debounce(
        (nextSize: number) => invokePromise(DeckOperation.UpdatePlankSize, { id: sizeKey, size: nextSize }),
        200,
      ),
      [invokePromise, sizeKey],
    );

    // TODO(thure): Tabster's focus group should handle moving focus to Main, but something is blocking it.
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.target === event.currentTarget) {
        switch (event.key) {
          case 'Escape':
            rootElement.current?.closest('main')?.focus();
            break;
          case 'Enter':
            rootElement.current && findFirstFocusable(rootElement.current)?.focus();
            break;
        }
      }
    }, []);

    useLayoutEffect(() => {
      if (scrollIntoView === id) {
        layoutMode === 'deck' && rootElement.current?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        // Clear the scroll into view state once it has been actioned.
        void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
      }
    }, [id, scrollIntoView, layoutMode, invokePromise]);

    const isSolo = layoutMode.startsWith('solo') && part === 'solo';
    const isAttendable =
      (layoutMode.startsWith('solo') && part.startsWith('solo')) || (layoutMode === 'deck' && part === 'deck');
    const sizeAttrs = useMainSize();

    const data = useMemo(
      () =>
        node && {
          attendableId: id,
          subject: node.data,
          companionTo: primary?.data,
          properties: node.properties,
          variant,
          path,
          popoverAnchorId,
        },
      [node, node?.data, node?.properties, path, popoverAnchorId, primary?.data, variant],
    );

    // TODO(wittjosiah): Change prop to accept a component.
    const placeholder = useMemo(() => <PlankLoading />, []);

    const Root = part.startsWith('solo') ? 'article' : StackItem.Root;
    const fullscreen = layoutMode === 'solo--fullscreen';
    const className = mx(
      'dx-attention-surface relative dx-focus-ring-inset-over-all dx-density-coarse',
      isSolo && 'absolute inset-0',
      isSolo && mainIntrinsicSize,
      railGridHorizontal,
      part.startsWith('solo') && 'grid',
      part.startsWith('solo-') && 'grid-rows-subgrid row-span-2 min-w-0',
      fullscreen && 'grid-rows-1',
      part === 'deck' && (companioned === 'companion' ? 'border-separator! border-e' : 'border-separator! border-x'),
      part === 'solo-companion' && 'border-separator! border-s',
      settings?.encapsulatedPlanks &&
        !part.startsWith('solo') &&
        'mx-(--main-spacing) border-separator! border rounded-sm overflow-hidden',
    );

    return (
      <Root
        ref={rootElement}
        data-testid='deck.plank'
        data-popover-collision-boundary={true}
        tabIndex={0}
        {...(part.startsWith('solo')
          ? ({ ...sizeAttrs, className } as any)
          : {
              item: { id },
              size,
              onSizeChange: handleSizeChange,
              classNames: className,
              order,
              role: 'article',
            })}
        {...(isAttendable ? attentionAttrs : {})}
        onKeyDown={handleKeyDown}
      >
        {node ? (
          <>
            {!fullscreen && (
              <PlankHeading
                id={id}
                part={part.startsWith('solo-') ? 'solo' : part}
                node={node}
                layoutMode={layoutMode}
                deckEnabled={settings?.enableDeck}
                canIncrementStart={canIncrementStart}
                canIncrementEnd={canIncrementEnd}
                popoverAnchorId={popoverAnchorId}
                primaryId={primary?.id}
                companioned={companioned}
                companions={companions}
              />
            )}
            <Surface.Surface
              key={node.id}
              role='article'
              data={data}
              limit={1}
              fallback={PlankErrorFallback}
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
