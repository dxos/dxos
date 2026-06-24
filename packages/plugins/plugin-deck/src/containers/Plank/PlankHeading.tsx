//
// Copyright 2024 DXOS.org
//

import React, {
  type ComponentPropsWithRef,
  Fragment,
  type MouseEvent,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, AttentionSigil, AttentionSigilButton, type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { Graph, type Node, useActionRunner } from '@dxos/plugin-graph';
import { Icon, IconButton, Popover, TextTooltip, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type AttendableId, type Related, getLinkedVariant, useAttention } from '@dxos/react-ui-attention';
import { hoverableControls, hoverableFocusedWithinControls, iconSize, mx } from '@dxos/ui-theme';

import { useBreakpoints } from '#hooks';
import { meta } from '#meta';
import { DeckOperation } from '#types';
import { type LayoutMode, PLANK_COMPANION_TYPE, type ResolvedPart } from '#types';

import { PlankCompanionControls, PlankControls } from './PlankControls';
import { usePlankContext } from './PlankRoot';

const MAX_COMPANIONS = 5;

// Plank heading rail. Fills the enclosing slot (Panel toolbar row / Stack rail row), which sets the height.
const headingRail = 'flex items-center border-x-0! bg-header-surface border-subdued-separator h-full';

type PlankHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId & Related;

// Attention-aware plank title; colors to the accent when the plank (or a related companion) is attended.
const PlankHeadingLabel = forwardRef<HTMLHeadingElement, PlankHeadingLabelProps>(
  ({ attendableId, related, classNames, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={((related && isRelated) || hasAttention || isAncestor).toString()}
        className={mx(
          'px-1 min-w-0 w-0 grow truncate font-medium text-base-fg data-[attention=true]:text-accent-text self-center',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);

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
  actions?: AttentionSigilAction[];
  debug?: boolean;
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
    debug = false,
  }: PlankHeadingProps) => {
    const { t } = useTranslation(meta.profile.key);
    const { graph, onAdjust, onUpdateCompanion } = usePlankContext('PlankHeading');
    const runAction = useActionRunner();
    const breakpoint = useBreakpoints();
    const icon = node?.properties?.icon ?? 'ph--circle-dashed--regular';
    const label = pending
      ? t('pending.heading')
      : toLocalizedString(node?.properties?.label ?? ['plank-heading-fallback.label', { ns: meta.profile.key }], t);

    const isCompanionNode = node?.type === PLANK_COMPANION_TYPE;

    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        // Load actions for the node.
        if (node) {
          void Graph.expand(graph, node.id, 'child');
        }
      });

      return () => cancelAnimationFrame(frame);
    }, [node]);

    const attendableId = primaryId ?? id;
    const capabilities = useMemo(
      () => ({
        deck: deckEnabled ?? true,
        solo: breakpoint !== 'mobile' && (part === 'solo' || part === 'multi'),
        incrementStart: canIncrementStart,
        incrementEnd: canIncrementEnd,
        fullscreen: !isCompanionNode,
        companion: layoutMode !== 'multi' && !isCompanionNode && companions && companions.length > 0,
      }),
      [breakpoint, part, companions, canIncrementStart, canIncrementEnd, isCompanionNode, deckEnabled, layoutMode],
    );

    const variant = isCompanionNode ? getLinkedVariant(id) : undefined;
    const sigilActions = useMemo(() => {
      if (!node) {
        return undefined;
      } else if (variant) {
        return [];
      } else {
        return [
          actions,
          Graph.getActions(graph, node.id).filter((action) =>
            ['list-item', 'list-item-primary', 'heading-list-item'].includes(action.properties.disposition),
          ),
        ].filter((a) => a.length > 0);
      }
    }, [actions, node, variant, graph]);

    const handleAction = useCallback(
      (action: AttentionSigilAction) => {
        if (typeof action.data === 'function') {
          void runAction(action as Node.Action, { parent: node, caller: meta.profile.key });
        }
      },
      [node, runAction],
    );

    const handlePlankAction = useCallback(
      (eventType: DeckOperation.PartAdjustment) => {
        onAdjust?.(id, eventType);
      },
      [onAdjust, id],
    );

    const ActionRoot = node && popoverAnchorId === `${meta.profile.key}:${node.id}` ? Popover.Anchor : Fragment;

    const handleTabClick = useCallback(
      (event: MouseEvent) => {
        const target = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
        const tabId = target?.dataset?.id;
        if (tabId) {
          onUpdateCompanion?.(tabId);
        }
      },
      [onUpdateCompanion],
    );

    return (
      <div
        role='heading'
        data-tauri-drag-region
        data-plank-heading
        style={iconSize(5)}
        className={mx(
          headingRail,
          'py-1 items-stretch gap-1 sticky left-12 dx-app-drag min-w-0 dx-contain-layout dx-density-lg',
          part === 'solo'
            ? 'ps-[calc(env(safe-area-inset-left)+.25rem)] pe-[calc(env(safe-area-inset-right)+.25rem)]'
            : 'px-1',
          layoutMode === 'solo--fullscreen' && [
            hoverableControls,
            hoverableFocusedWithinControls,
            '*:transition-opacity *:opacity-(--controls-opacity) bg-transparent',
            'border-transparent transition-[background-color,border-color]',
            'hover-hover:hover:bg-header-surface focus-within:bg-header-surface',
            'hover-hover:hover:border-subdued-separator focus-within:border-subdued-separator',
          ],
        )}
      >
        {companions && isCompanionNode ? (
          /* TODO(thure): IMPORTANT: This is a tablist; it should be implemented as such. */
          <div data-tauri-drag-region className='flex-1 min-w-0 overflow-x-auto scrollbar-none flex gap-1'>
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
                <AttentionSigil
                  icon={icon}
                  related={part === 'complementary'}
                  attendableId={attendableId}
                  triggerLabel={t('actions-menu.label')}
                  actions={sigilActions}
                  onAction={handleAction}
                >
                  <Surface.Surface
                    type={AppSurface.MenuFooter}
                    data={{ subject: node.data } satisfies AppSurface.MenuFooterData}
                  />
                </AttentionSigil>
              ) : (
                <AttentionSigilButton>
                  <span className='sr-only'>{label}</span>
                  <Icon icon={icon} />
                </AttentionSigilButton>
              )}
            </ActionRoot>
            <TextTooltip text={label} onlyWhenTruncating>
              <PlankHeadingLabel
                data-tauri-drag-region
                attendableId={attendableId}
                related={part === 'complementary'}
                {...(pending && { classNames: 'text-description' })}
              >
                {label}
              </PlankHeadingLabel>
            </TextTooltip>
          </>
        )}
        {debug && (
          <div className='flex items-center text-sm text-info-text'>
            {layoutMode}:{part}:{companioned}
          </div>
        )}
        {node && part !== 'complementary' && (
          <Surface.Surface
            type={AppSurface.NavbarEnd}
            data={{ subject: node.data } satisfies AppSurface.NavbarEndData}
          />
        )}
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
      </div>
    );
  },
);
