//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import React, { type KeyboardEvent, memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { getCompanionVariant } from '@dxos/app-toolkit';
import { debounce } from '@dxos/async';
import { type Node } from '@dxos/plugin-graph';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/ui-theme';

import { useMainSize } from '../../hooks';
import { PLANK_COMPANION_TYPE } from '../../types';

import { PlankRootProps, usePlankContext } from './PlankRoot';
import { PlankError, PlankErrorFallback } from './PlankError';
import { PlankHeading } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

// TOOD(burdon): Get layoutMode from root.
export type PlankComponentProps = Pick<PlankRootProps, 'part' | 'layoutMode' | 'settings'> & {
  id: string;
  path?: string[];
  order?: number;
  active?: string[];
  node?: Node.Node;
  primary?: Node.Node;
  companions?: Node.Node[];
  companioned?: 'primary' | 'companion';
};

export const PlankComponent = memo(
  ({
    // part,
    // layoutMode,
    // settings,
    id,
    path,
    order,
    active,
    node,
    primary,
    companions,
    companioned,
  }: PlankComponentProps) => {
    const { popoverAnchorId, scrollIntoView, plankSizing, onResize, onScrollIntoView } =
      usePlankContext('PlankComponent');

    const canResize = layoutMode === 'multi';
    const { findFirstFocusable } = useFocusFinders();
    const attentionAttrs = useAttentionAttributes(primary?.id ?? id);
    const orderId = companioned === 'companion' ? primary?.id : id;
    const index = orderId && active ? active.findIndex((entryId) => entryId === orderId) : -1;
    const length = active?.length ?? 1;
    const isOrdered = !!active && index >= 0;
    const canIncrementStart = isOrdered && index > 0;
    const canIncrementEnd = isOrdered && index < length - 1;

    const rootElement = useRef<HTMLDivElement | null>(null);

    const variant = node?.type === PLANK_COMPANION_TYPE ? getCompanionVariant(id) : undefined;
    const sizeKey = id.split('+')[0];
    const size = plankSizing?.[sizeKey] as number | undefined;

    const handleSizeChange = useCallback(
      debounce((nextSize: number) => {
        onResize?.(sizeKey, nextSize);
      }, 200),
      [onResize, sizeKey],
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
        layoutMode === 'multi' && rootElement.current?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        onScrollIntoView?.(undefined);
      }
    }, [id, scrollIntoView, layoutMode, onScrollIntoView]);

    const isSolo = layoutMode.startsWith('solo') && part === 'solo';
    const isAttendable =
      (layoutMode.startsWith('solo') && part.startsWith('solo')) || (layoutMode === 'multi' && part === 'multi');
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
      part === 'multi' && (companioned === 'companion' ? 'border-separator! border-e' : 'border-separator! border-x'),
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
