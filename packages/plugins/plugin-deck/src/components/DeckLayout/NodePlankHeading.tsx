//
// Copyright 2024 DXOS.org
//

import React, { Fragment, memo, useEffect, useMemo } from 'react';

import {
  LayoutAction,
  NavigationAction,
  SLUG_PATH_SEPARATOR,
  Surface,
  useIntentDispatcher,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import { type Node, useGraph } from '@dxos/plugin-graph';
import { Icon, Popover, toLocalizedString, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { PlankHeading, type PlankHeadingAction } from '@dxos/react-ui-stack/next';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

import { DECK_PLUGIN } from '../../meta';

export type NodePlankHeadingProps = {
  coordinate: LayoutCoordinate;
  node?: Node;
  canIncrementStart?: boolean;
  canIncrementEnd?: boolean;
  canResize?: boolean;
  popoverAnchorId?: string;
  pending?: boolean;
  actions?: PlankHeadingAction[];
};

export const NodePlankHeading = memo(
  ({
    coordinate,
    node,
    canIncrementStart,
    canIncrementEnd,
    canResize,
    popoverAnchorId,
    pending,
    actions = [],
  }: NodePlankHeadingProps) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const { graph } = useGraph();
    const icon = node?.properties?.icon ?? 'ph--placeholder--regular';
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

    const layoutPart = coordinate.part;
    // NOTE(Zan): Node ids may now contain a path like `${space}:${id}~comments`
    const attendableId = coordinate.entryId.split(SLUG_PATH_SEPARATOR).at(0);
    const capabilities = useMemo(
      () => ({
        solo: (layoutPart === 'solo' || layoutPart === 'main') && isNotMobile,
        incrementStart: canIncrementStart,
        incrementEnd: canIncrementEnd,
        resize: canResize,
      }),
      [isNotMobile, layoutPart, canIncrementStart, canIncrementEnd, canResize],
    );

    return (
      <PlankHeading.Root classNames='pie-1'>
        <ActionRoot>
          {node ? (
            <PlankHeading.ActionsMenu
              icon={icon}
              related={layoutPart === 'complementary'}
              attendableId={attendableId}
              triggerLabel={t('actions menu label')}
              actions={[actions, graph.actions(node)].filter((a) => a.length > 0)}
              onAction={(action) =>
                typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN })
              }
            >
              <Surface role='menu-footer' data={{ object: node.data }} />
            </PlankHeading.ActionsMenu>
          ) : (
            <PlankHeading.Button>
              <span className='sr-only'>{label}</span>
              <Icon icon={icon} size={5} />
            </PlankHeading.Button>
          )}
        </ActionRoot>
        <TextTooltip text={label} onlyWhenTruncating>
          <PlankHeading.Label
            attendableId={attendableId}
            related={layoutPart === 'complementary'}
            {...(pending && { classNames: 'text-description' })}
          >
            {label}
          </PlankHeading.Label>
        </TextTooltip>
        {node && layoutPart !== 'complementary' && (
          // TODO(Zan): What are we doing with layout coordinate here?
          <Surface role='navbar-end' direction='inline-reverse' data={{ object: node.data }} />
        )}
        {/* NOTE(thure): Pinning & unpinning are temporarily disabled */}
        <PlankHeading.Controls
          capabilities={capabilities}
          isSolo={layoutPart === 'solo'}
          classNames='mis-1'
          onClick={(eventType) => {
            if (!layoutPart) {
              return;
            }

            // TODO(Zan): Update this to use the new layout actions.
            if (eventType === 'solo') {
              return dispatch([
                {
                  action: NavigationAction.ADJUST,
                  data: { type: eventType, layoutCoordinate: { part: 'main', entryId: coordinate.entryId } },
                },
              ]);
            } else if (eventType === 'close') {
              if (layoutPart === 'complementary') {
                return dispatch({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'complementary',
                    state: false,
                  },
                });
              } else {
                return dispatch({
                  action: NavigationAction.CLOSE,
                  data: {
                    activeParts: {
                      [layoutPart]: [coordinate.entryId],
                    },
                  },
                });
              }
            } else {
              return dispatch({
                action: NavigationAction.ADJUST,
                data: { type: eventType, layoutCoordinate: coordinate },
              });
            }
          }}
          close={layoutPart === 'complementary' ? 'minify-end' : true}
        />
      </PlankHeading.Root>
    );
  },
);
