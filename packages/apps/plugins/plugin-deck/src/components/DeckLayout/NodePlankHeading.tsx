//
// Copyright 2024 DXOS.org
//

import { Placeholder } from '@phosphor-icons/react';
import React, { Fragment, useEffect } from 'react';

import { type Node, useGraph } from '@braneframe/plugin-graph';
import {
  LayoutAction,
  NavigationAction,
  SLUG_COLLECTION_INDICATOR,
  SLUG_PATH_SEPARATOR,
  Surface,
  useIntentDispatcher,
  indexInPart,
  partLength,
  type LayoutParts,
  type LayoutPart,
  type LayoutEntry,
} from '@dxos/app-framework';
import { Popover, toLocalizedString, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { PlankHeading, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

import { DECK_PLUGIN } from '../../meta';

export const NodePlankHeading = ({
  node,
  id,
  layoutParts,
  layoutPart,
  // TODO(wittjosiah): Unused?
  layoutEntry,
  popoverAnchorId,
  pending,
  flatDeck,
}: {
  node?: Node;
  id?: string;
  layoutParts?: LayoutParts;
  layoutPart?: LayoutPart;
  layoutEntry?: LayoutEntry;
  popoverAnchorId?: string;
  pending?: boolean;
  flatDeck?: boolean;
}) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const { graph } = useGraph();
  const Icon = node?.properties?.icon ?? Placeholder;
  const label = pending
    ? t('pending heading')
    : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: DECK_PLUGIN }], t);
  const dispatch = useIntentDispatcher();
  const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;
  const [isNotMobile] = useMediaQuery('md');

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Load actions for the node.
      node && graph.actions(node);
    });

    return () => cancelAnimationFrame(frame);
  }, [node]);

  // NOTE(Zan): Node ids may now contain a path like `${space}:${id}~comments`
  const attendableId = id?.split(SLUG_PATH_SEPARATOR).at(0);

  const layoutCoordinate = layoutPart !== undefined && id !== undefined ? { part: layoutPart, entryId: id } : undefined;
  const index = indexInPart(layoutParts, layoutCoordinate);
  const length = partLength(layoutParts, layoutPart);

  const canIncrementStart =
    layoutPart === 'main' && index !== undefined && index > 0 && length !== undefined && length > 1;
  const canIncrementEnd = layoutPart === 'main' && index !== undefined && index < length - 1 && length !== undefined;

  return (
    <PlankHeading.Root {...((layoutPart !== 'main' || !flatDeck) && { classNames: 'pie-1' })}>
      <ActionRoot>
        {node ? (
          <PlankHeading.ActionsMenu
            Icon={Icon}
            attendableId={attendableId}
            triggerLabel={t('actions menu label')}
            actions={graph.actions(node)}
            onAction={(action) =>
              typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN })
            }
          >
            <Surface role='menu-footer' data={{ object: node.data }} />
          </PlankHeading.ActionsMenu>
        ) : (
          <PlankHeading.Button>
            <span className='sr-only'>{label}</span>
            <Icon {...plankHeadingIconProps} />
          </PlankHeading.Button>
        )}
      </ActionRoot>
      <TextTooltip text={label} onlyWhenTruncating>
        <PlankHeading.Label attendableId={node?.id} {...(pending && { classNames: 'fg-description' })}>
          {label}
        </PlankHeading.Label>
      </TextTooltip>
      {node && layoutPart !== 'complementary' && (
        // TODO(Zan): What are we doing with layout coordinate here?
        <Surface role='navbar-end' direction='inline-reverse' data={{ object: node.data }} />
      )}
      {/* NOTE(thure): Pinning & unpinning are temporarily disabled */}
      <PlankHeading.Controls
        capabilities={{
          solo: (layoutPart === 'solo' || layoutPart === 'main') && isNotMobile,
          incrementStart: canIncrementStart,
          incrementEnd: canIncrementEnd,
        }}
        isSolo={layoutPart === 'solo'}
        onClick={(eventType) => {
          if (!layoutPart) {
            return;
          }

          if (eventType === 'solo') {
            return dispatch([
              {
                action: NavigationAction.ADJUST,
                data: { type: eventType, layoutCoordinate: { part: 'main', entryId: id } },
              },
            ]);
          }

          // TODO(Zan): Update this to use the new layout actions.
          return dispatch(
            eventType === 'close'
              ? layoutPart === 'complementary'
                ? {
                    action: LayoutAction.SET_LAYOUT,
                    data: {
                      element: 'complementary',
                      state: false,
                    },
                  }
                : {
                    action: NavigationAction.CLOSE,
                    data: {
                      activeParts: {
                        complementary: [`${id}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`],
                        [layoutPart]: [id],
                      },
                    },
                  }
              : { action: NavigationAction.ADJUST, data: { type: eventType, layoutCoordinate } },
          );
        }}
        close={layoutCoordinate?.part === 'complementary' ? 'minify-end' : true}
      />
    </PlankHeading.Root>
  );
};
