//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { ThreadCard } from '../components/ThreadCard/index.ts';
import { parseLaneCard } from '../types.ts';

/** The `<lane>` row as a {@link ThreadCard}; a host replaces this widget to dispatch the card instead. */
export const LaneCardWidget = ({ view, children }: WidgetProps) => {
  const text = getXmlTextChild(children ?? []);
  const data = useMemo(() => parseLaneCard(text), [text]);
  const handleResize = useCallback(() => view?.requestMeasure(), [view]);
  return data ? <ThreadCard {...data} onResize={handleResize} /> : null;
};
