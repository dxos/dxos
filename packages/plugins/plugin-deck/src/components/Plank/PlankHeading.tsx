//
// Copyright 2024 DXOS.org
//

import React, { Fragment, type MouseEvent, memo, useCallback, useEffect, useMemo } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { Surface, useAppGraph, useIntentDispatcher } from '@dxos/app-framework/react';
import { Graph, type Node } from '@dxos/plugin-graph';
import { Icon, IconButton, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemSigilAction } from '@dxos/react-ui-stack';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/ui-theme';

import { useBreakpoints } from '../../hooks';
import { parseEntryId } from '../../layout';
import { meta } from '../../meta';
import { DeckAction, type LayoutMode, PLANK_COMPANION_TYPE, type ResolvedPart } from '../../types';
import { soloInlinePadding } from '../fragments';

import { PlankCompanionControls, PlankControls } from './PlankControls';

const MAX_COMPANIONS = 5;

export type PlankHeadingProps = {
  id: string;
  part: ResolvedPart;
  layoutMode?: LayoutMode;
  node?: Node.Node;
  deckEnabled?: boolean;
  canIncrementStart?: boolean;
  canIncrementEnd?: boolean;
  popoverAnchorId?: string;
  primaryId?: string;
  pending?: boolean;
  companioned?: 'primary' | 'companion';
  companions?: Node.Node[];
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
    const { t } = useTranslation(meta.id);
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const { graph } = useAppGraph();
    const breakpoint = useBreakpoints();
    const icon = node?.properties?.icon ?? 'ph--placeholder--regular';
    const label = pending
      ? t('pending heading')
      : toLocalizedString(node?.properties?.label ?? ['plank heading fallback label', { ns: meta.id }], t);

    const isCompanionNode = node?.type === PLANK_COMPANION_TYPE;

    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        // Load actions for the node.
        if (node) {
          void Graph.expand(graph, node.id);
        }
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
        fullscreen: !isCompanionNode,
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
        return [
          actions,
          Graph.getActions(graph, node.id).filter((a) =>
            ['list-item', 'list-item-primary', 'heading-list-item'].includes(a.properties.disposition),
          ),
        ].filter((a) => a.length > 0);
      }
    }, [actions, node, variant, graph]);

    const handleAction = useCallback(
      (action: StackItemSigilAction) => {
        typeof action.data === 'function' && void action.data?.({ parent: node, caller: meta.id });
      },
      [node],
    );

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

    const ActionRoot = node && popoverAnchorId === `dxos.org/ui/${meta.id}/${node.id}` ? Popover.Anchor : Fragment;

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
          'plb-1 items-stretch gap-1 sticky inline-start-12 app-drag min-is-0 contain-layout density-coarse',
          part === 'solo' ? soloInlinePadding : 'pli-1',
          ...(layoutMode === 'solo--fullscreen'
            ? [
                hoverableControls,
                hoverableFocusedWithinControls,
                '*:transition-opacity *:opacity-[--controls-opacity] bg-transparent border-transparent transition-[background-color,border-color]',
                'hover-hover:hover:bg-headerSurface focus-within:bg-headerSurface hover-hover:hover:border-subduedSeparator focus-within:border-subduedSeparator',
              ]
            : []),
        ]}
        data-plank-heading
      >
        {companions && isCompanionNode ? (
          /* TODO(thure): IMPORTANT: This is a tablist; it should be implemented as such. */
          <div role='none' className='flex-1 min-is-0 overflow-x-auto scrollbar-none flex gap-1'>
            {companions.map(({ id, properties: { icon, label } }) => (
              <IconButton
                key={id}
                data-id={id}
                icon={icon}
                iconOnly={companions.length > MAX_COMPANIONS && node?.id !== id}
                label={toLocalizedString(label, t)}
                variant={node?.id === id ? 'primary' : 'ghost'}
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
                  <Icon icon={icon} />
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
