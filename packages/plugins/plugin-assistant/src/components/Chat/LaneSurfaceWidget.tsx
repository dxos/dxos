//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import { ThreadCardFlow, parseLaneCards } from '@dxos/react-ui-assistant';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { AssistantSurface } from '#types';

/** Renders a `<lane>` row by dispatching each of its cards to the {@link AssistantSurface.ThreadCard} surface. */
export const LaneSurfaceWidget = ({ view, children }: WidgetProps) => {
  const text = getXmlTextChild(children ?? []);
  const handleResize = useCallback(() => view?.requestMeasure(), [view]);
  const cards = useMemo(
    () => parseLaneCards(text).map((card) => ({ ...card, onResize: handleResize })),
    [text, handleResize],
  );
  return (
    <ThreadCardFlow>
      {cards.map((card) => (
        <Surface.Surface key={card.lane.id} type={AssistantSurface.ThreadCard} data={card} limit={1} />
      ))}
    </ThreadCardFlow>
  );
};
