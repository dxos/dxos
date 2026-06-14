//
// Copyright 2024 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { type KeyboardEvent, memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, type BranchDiffRequest, branchDiffAtom } from '@dxos/app-toolkit/ui';
import { debounce } from '@dxos/async';
import { Entity } from '@dxos/echo';
import { type Node } from '@dxos/plugin-graph';
import { mainIntrinsicSize } from '@dxos/react-ui';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { StackItem, type StackItemSize, railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/ui-theme';

import { useMainSize } from '#hooks';
import { PLANK_COMPANION_TYPE } from '#types';

import { PlankError, PlankErrorFallback } from './PlankError';
import { PlankHeading } from './PlankHeading';
import { PlankLoading } from './PlankLoading';
import { PlankRootProps, usePlankContext } from './PlankRoot';

/**
 * JS-based smooth scroll that won't be interrupted by MutationObserver or layout changes.
 */
const smoothScrollTo = (element: HTMLElement, target: number, duration: number) => {
  const start = element.scrollLeft;
  const distance = target - start;
  const startTime = performance.now();

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic.
    const eased = 1 - Math.pow(1 - progress, 3);
    element.scrollLeft = start + distance * eased;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

// NOTE: Calibrated to show PLANK + COMPANION on MBP 16" screen.
export const DEFAULT_SIZE = 48 satisfies StackItemSize;
export const DEFAULT_COMPANION_SIZE = 35 satisfies StackItemSize;

// Stable fallback so the time-travel hook can run unconditionally when the subject is not an entity.
const EMPTY_FALSE_ATOM = Atom.make<boolean>(() => false).pipe(Atom.keepAlive);
const EMPTY_DIFF_ATOM = Atom.make<BranchDiffRequest | undefined>(() => undefined).pipe(Atom.keepAlive);

export type PlankComponentProps = Pick<PlankRootProps, 'part'> & {
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
  ({ part, id, path, order, active, node, primary, companions, companioned }: PlankComponentProps) => {
    const { layoutMode, settings, popoverAnchorId, scrollIntoView, plankSizing, onResize, onScrollIntoView } =
      usePlankContext('PlankComponent');

    const canResize = layoutMode === 'multi';
    const { findFirstFocusable } = useFocusFinders();
    const isCompanion = companioned === 'companion';
    // Companions share attention with their primary; non-companions key attention to their own id.
    const attentionId = isCompanion ? (primary?.id ?? id) : id;
    const attentionAttrs = useAttentionAttributes(attentionId);
    const orderId = isCompanion ? primary?.id : id;
    const index = orderId && active ? active.findIndex((entryId) => entryId === orderId) : -1;
    const length = active?.length ?? 1;
    const isOrdered = !!active && index >= 0;
    const canIncrementStart = isOrdered && index > 0;
    const canIncrementEnd = isOrdered && index < length - 1;
    const rootElement = useRef<HTMLDivElement | null>(null);
    const variant = node?.type === PLANK_COMPANION_TYPE ? getLinkedVariant(id) : undefined;

    // Sizing.
    const sizeAttrs = useMainSize();
    const sizeKey = id.split('+')[0];
    const size = isCompanion
      ? DEFAULT_COMPANION_SIZE
      : ((plankSizing?.[sizeKey] as number | undefined) ?? DEFAULT_SIZE);
    const handleSizeChange = useCallback(
      debounce((nextSize: number) => {
        const size = Math.round(nextSize);
        onResize?.(sizeKey, size);
      }, 200),
      [sizeKey, onResize],
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
      if (scrollIntoView === id && layoutMode === 'multi' && rootElement.current) {
        const element = rootElement.current;
        const scrollParent = element.closest('[style*="overflow"], .overflow-x-auto') as HTMLElement | null;
        if (scrollParent) {
          const elementRect = element.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          const targetScrollLeft = scrollParent.scrollLeft + (elementRect.left - parentRect.left);

          smoothScrollTo(scrollParent, targetScrollLeft, 300);
        }

        onScrollIntoView?.(undefined);
      }
    }, [id, scrollIntoView, layoutMode, onScrollIntoView]);

    const isSolo = layoutMode.startsWith('solo') && part === 'solo';
    const isAttendable =
      (layoutMode.startsWith('solo') && part.startsWith('solo')) || (layoutMode === 'multi' && part === 'multi');

    // Companions share attention with their primary, so they attend to the primary's id
    // (matching the plank's attention container, which keys to `primary?.id ?? id`).
    const attendableId = isCompanion ? (primary?.id ?? id) : id;

    // The read-only mode is applied here, at an always-rendered (and therefore reactive) layer,
    // rather than in the graph-node connector — connectors are not guaranteed to re-run while a
    // plank is open, so a node's properties can go stale. The subject's own time-travel state is the
    // reactive source of truth: while it is time-traveling, surfaces show historical content in place
    // (the subject reads its own historical values) and the plank renders read-only.
    const timeTravelingAtom = useMemo(
      () =>
        node?.data != null && Entity.isEntity(node.data) ? Entity.timeTravelAtom(node.data) : EMPTY_FALSE_ATOM,
      [node?.data],
    );
    const timeTraveling = useAtomValue(timeTravelingAtom);
    // A device-local branch-diff view request (set by the Branches companion) drives the distinct
    // `'diff'` article mode. Read reactively here for the same reason as time-travel: node properties
    // can go stale while a plank is open.
    const diffAtom = useMemo(
      () => (node?.data != null && Entity.isEntity(node.data) ? branchDiffAtom(node.data.id) : EMPTY_DIFF_ATOM),
      [node?.data],
    );
    const diff = useAtomValue(diffAtom);
    const data = useMemo<AppSurface.ArticleData | undefined>(
      () =>
        node && {
          attendableId,
          subject: node.data,
          companionTo: primary?.data,
          properties: node.properties,
          // Distinct rendering modes: `'readonly'` while time-traveling, `'diff'` while comparing
          // branches (carrying the comparison target). A subject can't sensibly be both at once.
          mode: timeTraveling ? 'readonly' : diff ? 'diff' : node.properties?.mode,
          compareBranch: diff?.compareTo,
          variant,
          path,
          popoverAnchorId,
        },
      [
        node,
        node?.data,
        node?.properties,
        timeTraveling,
        diff,
        path,
        popoverAnchorId,
        primary?.data,
        variant,
        attendableId,
      ],
    );

    // TODO(wittjosiah): Change prop to accept a component.
    const placeholder = useMemo(() => <PlankLoading />, []);

    const Root = part.startsWith('solo') ? 'article' : StackItem.Root;
    const fullscreen = layoutMode === 'solo--fullscreen';
    const classNames = [
      'dx-attention-surface relative dx-focus-ring-inset-over-all dx-density-lg',
      isSolo && 'absolute inset-0',
      isSolo && mainIntrinsicSize,
      railGridHorizontal,
      part.startsWith('solo') && 'grid',
      part.startsWith('solo-') && 'grid-rows-subgrid row-span-2 min-w-0',
      fullscreen && 'grid-rows-1',
      part === 'multi' && (isCompanion ? 'border-separator! border-e' : 'border-separator! border-x'),
      part === 'solo-companion' && 'border-separator! border-s',
      settings?.encapsulatedPlanks &&
        !part.startsWith('solo') &&
        'mx-(--main-spacing) border-separator! border rounded-sm overflow-hidden',
    ];

    return (
      <Root
        ref={rootElement}
        data-testid='deck.plank'
        data-popover-collision-boundary={true}
        tabIndex={0}
        {...(part.startsWith('solo')
          ? ({
              className: mx(classNames),
              ...sizeAttrs,
            } as any)
          : {
              role: 'article',
              item: { id },
              classNames,
              order,
              size,
              onSizeChange: handleSizeChange,
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
              type={AppSurface.Article}
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
