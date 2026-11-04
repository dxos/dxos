//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import { parseLaneCard } from '@dxos/react-ui-assistant';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { AssistantSurface } from '#types';

/** Renders a `<lane>` row by dispatching to the {@link AssistantSurface.ThreadCard} surface. */
export const LaneSurfaceWidget = ({ view, children }: WidgetProps) => {
  const text = getXmlTextChild(children ?? []);
  const lane = useMemo(() => parseLaneCard(text), [text]);
  const handleResize = useCallback(() => view?.requestMeasure(), [view]);
  const data = useMemo(() => lane && { ...lane, onResize: handleResize }, [lane, handleResize]);
  return data ? <Surface.Surface type={AssistantSurface.ThreadCard} data={data} limit={1} /> : null;
};
