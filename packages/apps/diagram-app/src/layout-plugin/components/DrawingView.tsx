//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { AttendableContainer, Attention, useAttentionContext } from '@dxos/react-ui-attention';

import { dismissBootShell, isFrameShown } from './BootShell.tsx';

// The boot shell already drew the frame and the theme's background wash (the canvas), so only the scene's other layers,
// those with no controls, fade in.
const FADE_IN_CONTENT = '[&_[data-testid=scene-view]>*:not(:has(button)):not(canvas)]:animate-[fade-in_100ms_ease-out]';

/** The open diagram in the canvas article, filling the viewport. */
export const DrawingView = ({ drawing }: { drawing: Drawing.Drawing }) => {
  const ref = useRef<HTMLDivElement>(null);
  // The diagram's graph path, as the layout names it, so presence and a peer's Jump or follow find this view.
  const path = useMemo(() => GraphPath.getObjectPathFromObject(drawing), [drawing]);

  // Presence reports the attended object, so a diagram is attended as it shows: it takes focus, or, while a dialog or
  // popover (such as the diagram menu that chose it) holds focus, attention alone.
  const { attention } = useAttentionContext('DrawingView');
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const focusView = () => {
      const view = element.querySelector<HTMLElement>('[data-testid="scene-view"]');
      if (view && document.activeElement?.closest('[role="dialog"], [role="alertdialog"]')) {
        Attention.attendElement(attention, view);
      } else if (view) {
        view.focus({ preventScroll: true });
      }
      return !!view;
    };
    if (focusView()) {
      return;
    }
    const observer = new MutationObserver(() => focusView() && observer.disconnect());
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [path, attention]);

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

  return (
    <AttendableContainer id={path} classNames={['dx-grow grid', FADE_IN_CONTENT]} ref={ref}>
      <Surface.Surface
        key={drawing.id}
        type={AppSurface.Article}
        data={{ subject: drawing, attendableId: path }}
        limit={1}
      />
    </AttendableContainer>
  );
};
