//
// Copyright 2023 DXOS.org
//

import React, { memo, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph';

import { useCompanions, useDeckState, useSelectedCompanion } from '../../hooks';
import { DeckOperation } from '../../operations';
import { Plank, type PlankComponentProps } from '../Plank';

const UNKNOWN_ID = 'unknown_id';

export type ConnectedPlankProps = Pick<PlankComponentProps, 'layoutMode' | 'part' | 'settings'> &
  Partial<Pick<PlankComponentProps, 'path' | 'order' | 'active'>> & {
    id?: string;
    companionVariant?: string;
  };

/**
 * Connected Plank that calls hooks and renders the radix-style Plank tree.
 * This is the bridge between DeckContent (which knows about framework hooks) and
 * the pure Plank components (which receive everything via context).
 */
export const ConnectedPlank = memo(({ id = UNKNOWN_ID, companionVariant, ...props }: ConnectedPlankProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { state, deck } = useDeckState();
  const node = useNode(graph, id);
  const companions = useCompanions(id);
  const { companionId } = useSelectedCompanion(companions, companionVariant);
  const resolvedCompanionId = companionVariant ? companionId : undefined;
  const currentCompanion = companions.find(({ id }) => id === resolvedCompanionId);
  const hasCompanion = !!(resolvedCompanionId && currentCompanion);

  const handleAdjust = useCallback(
    (plankId: string, type: DeckOperation.PartAdjustment) => {
      if (type === 'close') {
        if (props.part === 'complementary') {
          return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        }
        return invokePromise(LayoutOperation.Close, { subject: [plankId] });
      }
      return invokePromise(DeckOperation.Adjust, { type, id: plankId });
    },
    [invokePromise, props.part],
  );

  const handleResize = useCallback(
    (plankId: string, size: number) => invokePromise(DeckOperation.UpdatePlankSize, { id: plankId, size }),
    [invokePromise],
  );

  const handleScrollIntoView = useCallback(
    (subject?: string) => invokePromise(LayoutOperation.ScrollIntoView, { subject }),
    [invokePromise],
  );

  const handleChangeCompanion = useCallback(
    (companion: string | null) => invokePromise(DeckOperation.ChangeCompanion, { companion }),
    [invokePromise],
  );

  return (
    <Plank.Root
      graph={graph}
      layoutMode={props.layoutMode}
      part={props.part}
      settings={props.settings}
      popoverAnchorId={state.popoverAnchorId}
      scrollIntoView={state.scrollIntoView}
      plankSizing={deck.plankSizing}
      onAdjust={handleAdjust}
      onResize={handleResize}
      onScrollIntoView={handleScrollIntoView}
      onChangeCompanion={handleChangeCompanion}
    >
      <Plank.Content
        solo={props.part === 'solo'}
        companion={hasCompanion}
        encapsulate={!!props.settings?.encapsulatedPlanks}
      >
        {/* TODO(burdon): Destructure props rather than passing everything to Root and Component. */}
        <Plank.Component
          id={id}
          node={node}
          companioned={hasCompanion ? 'primary' : undefined}
          companions={hasCompanion ? [] : companions}
          {...props}
          {...(props.part === 'solo' ? { part: 'solo-primary' } : {})}
        />
        {hasCompanion && (
          <Plank.Component
            id={resolvedCompanionId}
            node={currentCompanion}
            primary={node}
            companions={companions}
            companioned='companion'
            {...props}
            {...(props.part === 'solo' ? { part: 'solo-companion' } : { order: (props.order ?? 0) + 1 })}
          />
        )}
      </Plank.Content>
    </Plank.Root>
  );
});
