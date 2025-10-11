//
// Copyright 2024 DXOS.org
//

import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

import {
  LayoutAction,
  Surface,
  createIntent,
  useAppGraph,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { type Node, useNode } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR, useAttentionAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/react-ui-theme';

import { DeckCapabilities } from '../../capabilities';
import { useCompanions, useMainSize } from '../../hooks';
import { parseEntryId } from '../../layout';
import { DeckAction, type DeckSettingsProps, type LayoutMode, type ResolvedPart } from '../../types';

import { PlankContentError, PlankError } from './PlankError';
import { PlankHeading } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

const UNKNOWN_ID = 'unknown_id';

export type PlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'path' | 'order' | 'active' | 'settings'> & {
  id?: string;
  companionId?: string;
};

// TODO(burdon): Factor out conditional rendering.
//   Remove this wrapper component and render the entire set of planks in the deck with conditional visibility
//   to obviate mounting and unmounting when switching between solo and companion mode?
// NOTE(thure, in reply): Whether any surface should be rendered and hidden is a performance matter — remember that
//  article surfaces contain full experiences, so being able to unmount them will yield relatively large performance
//  benefits. I think where we anticipate users will definitely want to quickly switch between showing and hiding entire
//  articles, over the (again probably large) performance benefit that unmounting them would confer, we can mount and
//  hide them, but I think that scenario in its most unambiguous form is probably rare. You could extrapolate
//  the scenario to include all “potential” planks such as companions, which we could keep mounted and hidden, but I
//  don’t think the resulting performance would be acceptable. I think the real issue is “perceived performance” which
//  has mitigations that are in between mounting and un-mounting since both of those have tradeoffs; we may need one or more
//  “partially-mounted” experiences, like loading skeletons at the simple end, or screenshots of “sleeping” planks at
//  the advanced end.

/**
 * A Plank is the main container for surfaces within a Deck.
 * It may be paired with a companion plank that enables the user to select one of multiple companion surfaces.
 */
export const Plank = memo(({ id = UNKNOWN_ID, companionId, ...props }: PlankProps) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const companions = useCompanions(id);
  const currentCompanion = companions.find(({ id }) => id === companionId);
  const hasCompanion = !!(companionId && currentCompanion);

  return (
    <PlankContainer solo={props.part === 'solo'} companion={hasCompanion}>
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
          id={companionId}
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

const PlankContainer = ({ children, solo, companion }: PropsWithChildren<{ solo: boolean; companion: boolean }>) => {
  const sizeAttrs = useMainSize();
  if (!solo) {
    return children;
  }

  // TODO(burdon): Make resizable.
  return (
    <div
      role='none'
      className={mx('absolute inset-0 grid', companion && 'grid-cols-[1fr_1fr]', railGridHorizontal, mainIntrinsicSize)}
      {...sizeAttrs}
    >
      {children}
    </div>
  );
};

type PlankComponentProps = {
  layoutMode: LayoutMode;
  id: string;
  part: ResolvedPart;
  path?: string[];
  order?: number;
  active?: string[];
  // TODO(burdon): Change to role?
  companioned?: 'primary' | 'companion';
  node?: Node;
  primary?: Node;
  companions?: Node[];
  settings?: DeckSettingsProps;
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
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const { deck, popoverAnchorId, scrollIntoView } = useCapability(DeckCapabilities.DeckState);
    const canResize = layoutMode === 'deck';

    const attentionAttrs = useAttentionAttributes(primary?.id ?? id);
    const index = active ? active.findIndex((entryId) => entryId === id) : 0;
    const length = active?.length ?? 1;
    const canIncrementStart = active && index !== undefined && index > 0 && length !== undefined && length > 1;
    const canIncrementEnd = active && index !== undefined && index < length - 1 && length !== undefined;

    const rootElement = useRef<HTMLDivElement | null>(null);

    const { variant } = parseEntryId(id);
    const sizeKey = `${id.split('+')[0]}${variant ? `${ATTENDABLE_PATH_SEPARATOR}${variant}` : ''}`;
    const size = deck.plankSizing[sizeKey] as number | undefined;

    const handleSizeChange = useCallback(
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
        layoutMode === 'deck' && rootElement.current?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        // Clear the scroll into view state once it has been actioned.
        void dispatch(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: undefined }));
      }
    }, [id, scrollIntoView, layoutMode]);

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
    const className = mx(
      'attention-surface relative dx-focus-ring-inset-over-all density-coarse',
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
