//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useRef } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { AttendableContainer } from '@dxos/react-ui-attention';

import { dismissBootShell, isFrameShown, saveBootFrame } from './BootShell.tsx';

const SETTLE_TIMEOUT = 2_000;

// The frame is already on screen (the boot shell drew it), so only the scene's layers, those with no controls, fade in.
const FADE_IN_CONTENT = '[&_[data-testid=scene-view]>*:not(:has(button))]:animate-[fade-in_100ms_ease-out]';

/** The open diagram in the canvas article, filling the viewport. */
export const DrawingView = ({ drawing }: { drawing: Drawing.Drawing }) => {
  const ref = useRef<HTMLDivElement>(null);

  // The boot shell gives way once the live frame is on screen; the article can render a beat after the drawing is known.
  // Mutation callbacks run before the next paint, so the shell leaves in the frame the live one arrives.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (isFrameShown(element)) {
      dismissBootShell();
      return;
    }
    const observer = new MutationObserver(() => {
      if (isFrameShown(element)) {
        observer.disconnect();
        dismissBootShell();
      }
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  // The frame is saved once the diagram settles: how it looks as it opens, which is what the next load imitates.
  useEffect(() => {
    const save = () => ref.current && saveBootFrame(drawing.id, ref.current);
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(save, { timeout: SETTLE_TIMEOUT });
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(save, SETTLE_TIMEOUT);
    return () => clearTimeout(handle);
  }, [drawing.id]);

  return (
    <AttendableContainer id={drawing.id} classNames={['dx-grow grid', FADE_IN_CONTENT]} ref={ref}>
      <Surface.Surface
        key={drawing.id}
        type={AppSurface.Article}
        data={{ subject: drawing, attendableId: drawing.id }}
        limit={1}
      />
    </AttendableContainer>
  );
};
