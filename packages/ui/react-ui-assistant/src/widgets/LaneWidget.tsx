//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { ThreadCard, ThreadCardFlow } from '../components/ThreadCard/index.ts';
import { parseLaneCards } from '../types.ts';

/** The `<lane>` row as {@link ThreadCard}s; a host replaces this widget to dispatch the cards instead. */
export const LaneCardWidget = ({ view, children }: WidgetProps) => {
  const text = getXmlTextChild(children ?? []);
  const cards = useMemo(() => parseLaneCards(text), [text]);
  const handleResize = useCallback(() => view?.requestMeasure(), [view]);
  return (
    <ThreadCardFlow>
      {cards.map((card) => (
        <ThreadCard key={card.lane.id} {...card} onResize={handleResize} />
      ))}
    </ThreadCardFlow>
  );
};
