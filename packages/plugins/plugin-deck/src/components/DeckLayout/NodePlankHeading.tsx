//
// Copyright 2024 DXOS.org
//

import React, { Fragment, memo, useEffect, useMemo } from 'react';

import {
  createIntent,
  LayoutAction,
  NavigationAction,
  SLUG_PATH_SEPARATOR,
  Surface,
  useIntentDispatcher,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import { type Node, useGraph } from '@dxos/plugin-graph';
import { Icon, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemSigilAction } from '@dxos/react-ui-stack';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

import { PlankControls } from './PlankControls';
import { ToggleComplementarySidebarButton, ToggleSidebarButton } from './SidebarButton';
import { DECK_PLUGIN } from '../../meta';
import { useBreakpoints } from '../../util';
import { soloInlinePadding } from '../fragments';

export type NodePlankHeadingProps = {
  coordinate: LayoutCoordinate;
  node?: Node;
  canIncrementStart?: boolean;
  canIncrementEnd?: boolean;
  popoverAnchorId?: string;
  pending?: boolean;
  actions?: StackItemSigilAction[];
};

export const NodePlankHeading = memo(
  ({
    coordinate,
    node,
    canIncrementStart,
    canIncrementEnd,
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
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;
    const breakpoint = useBreakpoints();

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
        solo: layoutPart === 'solo' || layoutPart === 'main',
        incrementStart: canIncrementStart,
        incrementEnd: canIncrementEnd,
      }),
      [breakpoint, layoutPart, canIncrementStart, canIncrementEnd],
    );

    return (
      <StackItem.Heading
        classNames={[
          'plb-1 border-be border-separator items-stretch gap-1',
          layoutPart === 'solo' ? soloInlinePadding : 'pli-1',
        ]}
      >
        <ActionRoot>
          {node ? (
            <StackItem.Sigil
              icon={icon}
              related={layoutPart === 'complementary'}
              attendableId={attendableId}
              triggerLabel={t('actions menu label')}
              actions={[actions, graph.actions(node)].filter((a) => a.length > 0)}
              onAction={(action) =>
                typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN })
              }
            >
              <Surface role='menu-footer' data={{ subject: node.data }} />
            </StackItem.Sigil>
          ) : (
            <StackItem.SigilButton>
              <span className='sr-only'>{label}</span>
              <Icon icon={icon} size={5} />
            </StackItem.SigilButton>
          )}
        </ActionRoot>
        {breakpoint !== 'desktop' && <ToggleSidebarButton />}
        <TextTooltip text={label} onlyWhenTruncating>
          <StackItem.HeadingLabel
            attendableId={attendableId}
            related={layoutPart === 'complementary'}
            {...(pending && { classNames: 'text-description' })}
          >
            {label}
          </StackItem.HeadingLabel>
        </TextTooltip>
        {node && layoutPart !== 'complementary' && (
          // TODO(Zan): What are we doing with layout coordinate here?
          <Surface role='navbar-end' data={{ subject: node.data }} />
        )}
        {/* NOTE(thure): Pinning & unpinning are temporarily disabled */}
        <PlankControls
          capabilities={capabilities}
          isSolo={layoutPart === 'solo'}
          onClick={(eventType) => {
            if (!layoutPart) {
              return;
            }

            // TODO(Zan): Update this to use the new layout actions.
            if (eventType === 'solo') {
              return dispatch(
                createIntent(NavigationAction.Adjust, {
                  type: eventType,
                  layoutCoordinate: { part: 'main', entryId: coordinate.entryId },
                }),
              );
            } else if (eventType === 'close') {
              if (layoutPart === 'complementary') {
                return dispatch(createIntent(LayoutAction.SetLayout, { element: 'complementary', state: false }));
              } else {
                return dispatch(
                  createIntent(NavigationAction.Close, { activeParts: { [layoutPart]: [coordinate.entryId] } }),
                );
              }
            } else {
              return dispatch(createIntent(NavigationAction.Adjust, { type: eventType, layoutCoordinate: coordinate }));
            }
          }}
          close={layoutPart === 'complementary' ? 'minify-end' : true}
        >
          <ToggleComplementarySidebarButton />
        </PlankControls>
      </StackItem.Heading>
    );
  },
);
