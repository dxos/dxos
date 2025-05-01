//
// Copyright 2024 DXOS.org
//

import React, { Fragment, memo, useCallback, useEffect, useMemo, type MouseEvent } from 'react';

import { createIntent, LayoutAction, Surface, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { Icon, IconButton, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemSigilAction } from '@dxos/react-ui-stack';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

import { PlankCompanionControls, PlankControls } from './PlankControls';
import { parseEntryId } from '../../layout';
import { DECK_PLUGIN } from '../../meta';
import { PLANK_COMPANION_TYPE, DeckAction, type ResolvedPart, type LayoutMode } from '../../types';
import { useBreakpoints } from '../../util';
import { soloInlinePadding } from '../fragments';

export type PlankHeadingProps = {
  id: string;
  part: ResolvedPart;
  layoutMode?: LayoutMode;
  node?: Node;
  deckEnabled?: boolean;
  canIncrementStart?: boolean;
  canIncrementEnd?: boolean;
  popoverAnchorId?: string;
  primaryId?: string;
  pending?: boolean;
  companioned?: 'primary' | 'companion';
  companions?: Node[];
  actions?: StackItemSigilAction[];
};

export const PlankHeading = memo(
  ({
    id,
    part,
    node,
    deckEnabled,
    canIncrementStart,
    canIncrementEnd,
    popoverAnchorId,
    primaryId,
    pending,
    companioned,
    companions,
    layoutMode,
    actions = [],
  }: PlankHeadingProps) => {
    const { t } = useTranslation(DECK_PLUGIN);
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const { graph } = useAppGraph();
    const breakpoint = useBreakpoints();
    const icon = node?.properties?.icon ?? 'ph--placeholder--regular';
    const label = pending
      ? t('pending heading')
      : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: DECK_PLUGIN }], t);

    const isCompanionNode = node?.type === PLANK_COMPANION_TYPE;

    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        // Load actions for the node.
        node && graph.actions(node);
      });

      return () => cancelAnimationFrame(frame);
    }, [node]);

    const attendableId = primaryId ?? id;
    const capabilities = useMemo(
      () => ({
        deck: deckEnabled ?? true,
        solo: breakpoint !== 'mobile' && (part === 'solo' || part === 'deck'),
        incrementStart: canIncrementStart,
        incrementEnd: canIncrementEnd,
        companion: !isCompanionNode && companions && companions.length > 0,
      }),
      [breakpoint, part, companions, canIncrementStart, canIncrementEnd, isCompanionNode, deckEnabled],
    );

    const { variant } = parseEntryId(id);
    const sigilActions = useMemo(() => {
      if (!node) {
        return undefined;
      } else if (variant) {
        return [];
      } else {
        return [actions, graph.actions(node)].filter((a) => a.length > 0);
      }
    }, [actions, node, variant, graph]);

    const handleAction = useCallback((action: StackItemSigilAction) => {
      typeof action.data === 'function' && action.data?.({ node: action as Node, caller: DECK_PLUGIN });
    }, []);

    const handlePlankAction = useCallback(
      (eventType: DeckAction.PartAdjustment) => {
        if (eventType.startsWith('solo')) {
          return dispatch(createIntent(DeckAction.Adjust, { type: eventType, id }));
        } else if (eventType === 'close') {
          if (part === 'complementary') {
            return dispatch(
              createIntent(LayoutAction.UpdateComplementary, {
                part: 'complementary',
                options: { state: 'collapsed' },
              }),
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

    const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${DECK_PLUGIN}/${node.id}` ? Popover.Anchor : Fragment;

    const handleTabClick = useCallback(
      (event: MouseEvent) => {
        const target = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
        const tabId = target?.dataset?.id;
        if (primaryId && tabId) {
          void dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: primaryId,
              companion: tabId,
            }),
          );
        }
      },
      [primaryId],
    );

    return (
      <StackItem.Heading
        classNames={[
          'plb-1 border-be border-separator items-stretch gap-1 sticky inline-start-12 app-drag min-is-0 contain-layout',
          part === 'solo' ? soloInlinePadding : 'pli-1',
        ]}
      >
        {companions && isCompanionNode ? (
          <div role='none' className='flex-1 min-is-0 overflow-x-auto scrollbar-thin flex gap-1'>
            {companions.map(({ id, properties: { icon, label } }) => (
              <IconButton
                key={id}
                data-id={id}
                icon={icon}
                iconOnly={node?.id !== id}
                label={toLocalizedString(label, t)}
                size={5}
                variant={node?.id === id ? 'primary' : 'default'}
                onClick={handleTabClick}
              />
            ))}
          </div>
        ) : (
          <>
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
          </>
        )}
        {node && part !== 'complementary' && <Surface role='navbar-end' data={{ subject: node.data }} />}
        {companioned === 'companion' ? (
          <PlankCompanionControls primary={primaryId} />
        ) : (
          <PlankControls
            capabilities={capabilities}
            layoutMode={layoutMode}
            close={part === 'complementary' ? 'minify-end' : true}
            onClick={handlePlankAction}
          />
        )}
      </StackItem.Heading>
    );
  },
);
