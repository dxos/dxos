//
// Copyright 2024 DXOS.org
//

import React, { Fragment, memo, useCallback, useEffect, useMemo } from 'react';

import { createIntent, LayoutAction, Surface, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { Icon, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemSigilAction } from '@dxos/react-ui-stack';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

import { PlankControls } from './PlankControls';
import { ToggleComplementarySidebarButton } from './SidebarButton';
import { DECK_PLUGIN } from '../../meta';
import { DeckAction, SLUG_PATH_SEPARATOR } from '../../types';
import { soloInlinePadding } from '../fragments';

export type NodePlankHeadingProps = {
  id: string;
  part: 'solo' | 'deck' | 'complementary';
  node?: Node;
  canIncrementStart?: boolean;
  canIncrementEnd?: boolean;
  popoverAnchorId?: string;
  pending?: boolean;
  actions?: StackItemSigilAction[];
};

export const NodePlankHeading = memo(
  ({
    id,
    part,
    node,
    canIncrementStart,
    canIncrementEnd,
    popoverAnchorId,
    pending,
    actions = [],
  }: NodePlankHeadingProps) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const { graph } = useAppGraph();
    const icon = node?.properties?.icon ?? 'ph--placeholder--regular';
    const label = pending
      ? t('pending heading')
      : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: DECK_PLUGIN }], t);
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;

    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        // Load actions for the node.
        node && graph.actions(node);
      });

      return () => cancelAnimationFrame(frame);
    }, [node]);

    // NOTE(Zan): Node ids may now contain a path like `${space}:${id}~comments`
    const attendableId = id.split(SLUG_PATH_SEPARATOR).at(0);
    const capabilities = useMemo(
      () => ({
        solo: part === 'solo' || part === 'deck',
        incrementStart: canIncrementStart,
        incrementEnd: canIncrementEnd,
      }),
      [part, canIncrementStart, canIncrementEnd],
    );

    const sigilActions = useMemo(
      () => node && [actions, graph.actions(node)].filter((a) => a.length > 0),
      [actions, node, graph],
    );
    const handleAction = useCallback((action: StackItemSigilAction) => {
      typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN });
    }, []);

    const handlePlankAction = useCallback(
      (eventType: DeckAction.PartAdjustment) => {
        if (eventType === 'solo') {
          return dispatch(createIntent(DeckAction.Adjust, { type: eventType, id }));
        } else if (eventType === 'close') {
          if (part === 'complementary') {
            return dispatch(
              createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', options: { state: false } }),
            );
          } else {
            return dispatch(
              createIntent(LayoutAction.Close, { part: 'main', subject: [id], options: { state: false } }),
            );
          }
        } else {
          return dispatch(createIntent(DeckAction.Adjust, { type: eventType, id }));
        }
      },
      [dispatch, id, part],
    );

    return (
      <StackItem.Heading
        classNames={[
          'plb-1 border-be border-separator items-stretch gap-1 sticky inline-start-12',
          part === 'solo' ? soloInlinePadding : 'pli-1',
        ]}
      >
        <ActionRoot>
          {node && sigilActions ? (
            <StackItem.Sigil
              icon={icon}
              related={part === 'complementary'}
              attendableId={attendableId}
              triggerLabel={t('actions menu label')}
              actions={sigilActions}
              onAction={handleAction}
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
        <TextTooltip text={label} onlyWhenTruncating>
          <StackItem.HeadingLabel
            attendableId={attendableId}
            related={part === 'complementary'}
            {...(pending && { classNames: 'text-description' })}
          >
            {label}
          </StackItem.HeadingLabel>
        </TextTooltip>
        {node && part !== 'complementary' && <Surface role='navbar-end' data={{ subject: node.data }} />}
        <PlankControls
          capabilities={capabilities}
          isSolo={part === 'solo'}
          onClick={handlePlankAction}
          close={part === 'complementary' ? 'minify-end' : true}
        >
          <ToggleComplementarySidebarButton />
        </PlankControls>
      </StackItem.Heading>
    );
  },
);
