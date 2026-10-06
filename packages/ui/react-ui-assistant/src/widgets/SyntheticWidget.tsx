//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { type WidgetProps, getXmlInnerText } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { PANEL_FRAME, WidgetPanel } from './WidgetPanel.tsx';

export type SyntheticWidgetProps = WidgetProps;

/**
 * A system-generated turn: a trigger, an alarm wake-up, a continuation nudge, a tool result
 * recovered across a reload. Collapsed to its first line behind a disclosure, like the model's own
 * panels, so it reads as machinery rather than prose, and glyphed as input, because it is a prompt
 * nobody typed.
 */
export const SyntheticWidget = ({ view, children }: SyntheticWidgetProps) => {
  // `getXmlInnerText`: a model fences blocks in tags of its own, and `getXmlTextChild` would stop
  // at the first one — the reader saw a heading and an opening fence, then nothing.
  const text = getXmlInnerText(children ?? [])?.trim();

  // CodeMirror measures the block as the portal mounts, before the panel has settled.
  useEffect(() => {
    const frame = requestAnimationFrame(() => view?.requestMeasure());
    return () => cancelAnimationFrame(frame);
  }, [view, text]);

  const handleChangeOpen = useCallback(() => {
    // Measure after the height ramp.
    setTimeout(() => view?.requestMeasure(), 1_000);
  }, [view]);

  if (!text) {
    return null;
  }

  return (
    <WidgetPanel
      icon='ph--lightning--regular'
      label={text.split('\n')[0]}
      testId='assistant.synthetic'
      onChangeOpen={handleChangeOpen}
    >
      {/* `whitespace-pre-wrap`: the renderer collapses paragraph breaks but keeps single newlines,
          and a wake-up prompt puts its reminder on the line below its own preamble. */}
      <div
        className={mx(PANEL_FRAME, 'p-trim-sm text-sm text-fg-muted whitespace-pre-wrap tabular-nums')}
        data-synthetic-text=''
      >
        {text}
      </div>
    </WidgetPanel>
  );
};
