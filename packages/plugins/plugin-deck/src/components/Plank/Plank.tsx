//
// Copyright 2024 DXOS.org
//

import React, {
  Fragment,
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
  useCapability,
  useAppGraph,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { useNode, type Node } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR, useAttendableAttributes } from '@dxos/react-ui-attention';
import { StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/react-ui-theme';

import { PlankContentError, PlankError } from './PlankError';
import { PlankHeading } from './PlankHeading';
import { PlankLoading } from './PlankLoading';
import { DeckCapabilities } from '../../capabilities';
import { useMainSize } from '../../hooks';
import { parseEntryId } from '../../layout';
import { DeckAction, type LayoutMode, type ResolvedPart, type DeckSettingsProps } from '../../types';
import { useCompanions } from '../../util';

const UNKNOWN_ID = 'unknown_id';

type PlankComponentProps = {
  layoutMode: LayoutMode;
  id: string;
  part: ResolvedPart;
  path?: string[];
  order?: number;
  active?: string[];
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
    const { deck, popoverAnchorId, scrollIntoView } = useCapability(DeckCapabilities.DeckState); // TODO(burdon): ???
    const canResize = layoutMode === 'deck';

    const attendableAttrs = useAttendableAttributes(primary?.id ?? id);
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
        // TODO(wittjosiah): When focused on page load, the focus is always visible.
        //   Forcing focus to something smaller than the plank prevents large focus ring in the interim.
        const focusable = rootElement.current?.querySelector('button') || rootElement.current;
        focusable?.focus({ preventScroll: true });
        layoutMode === 'deck' && focusable?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
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
          subject: node.data,
          companionTo: primary?.data,
          variant,
          path,
          popoverAnchorId,
        },
      [node, node?.data, path, popoverAnchorId, primary?.data, variant],
    );

    // TODO(wittjosiah): Change prop to accept a component.
    const placeholder = useMemo(() => <PlankLoading />, []);

    const Root = part.startsWith('solo') ? 'article' : StackItem.Root;
    const classNames = mx(
      'attention-surface relative',
      isSolo && mainIntrinsicSize,
      isSolo && railGridHorizontal,
      isSolo && 'absolute inset-0',
      part.startsWith('solo') && 'grid',
      part === 'deck' && (companioned === 'companion' ? '!border-separator border-ie' : '!border-separator border-li'),
      part.startsWith('solo-') && 'row-span-2 grid-rows-subgrid min-is-0',
      part === 'solo-companion' && '!border-separator border-is',
      layoutMode === 'solo--fullscreen' &&
        '!transition-[margin-block-start,inline-size] -mbs-[--rail-action] has-[[data-plank-heading]:hover]:mbs-0',
    );

    return (
      <Root
        ref={rootElement}
        data-testid='deck.plank'
        tabIndex={0}
        {...(part.startsWith('solo')
          ? ({ ...sizeAttrs, className: classNames } as any)
          : {
              item: { id },
              size,
              onSizeChange: handleSizeChange,
              classNames,
              order,
              role: 'article',
            })}
        {...(isAttendable ? attendableAttrs : {})}
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

export type PlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'path' | 'order' | 'active' | 'settings'> & {
  id?: string;
  companionId?: string;
};

export const Plank = ({ id = UNKNOWN_ID, companionId, ...props }: PlankProps) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const companions = useCompanions(id);
  const currentCompanion = companions.find(({ id }) => id === companionId);

  // TODO(burdon): Causes unmount when switching between solo and split.
  if (companionId && currentCompanion) {
    const Root = props.part === 'solo' ? SplitFrame : Fragment;
    return (
      <Root>
        <PlankComponent
          id={id}
          node={node}
          companioned='primary'
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-primary' } : {})}
        />
        <PlankComponent
          id={companionId}
          node={currentCompanion}
          primary={node}
          companions={companions}
          companioned='companion'
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: (props.order ?? 0) + 1 })}
        />
      </Root>
    );
  } else {
    return <PlankComponent id={id} node={node} companions={companions} {...props} />;
  }
};

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
