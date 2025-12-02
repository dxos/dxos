//
// Copyright 2025 DXOS.org
//

import React, { type ReactElement, cloneElement, forwardRef, useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { addEventListener, combine } from '@dxos/async';
import { useMergeRefs } from '@dxos/react-hooks';

import { useSurface } from './Surface';

export type SurfaceInfoProps = {
  children: ReactElement<{ ref?: React.Ref<HTMLElement> }>;
};

export const SurfaceInfo = forwardRef<HTMLElement, SurfaceInfoProps>(({ children }, forwardedRef) => {
  const active = true; //'__DX_DEBUG__' in window;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [expand, setExpand] = useState(false); // TOOD(burdon): Save state.
  const info = useSurface();

  const [root, setRoot] = useState<HTMLElement | null>(null);
  const measureRef = useCallback((node: HTMLElement | null) => setRoot(node), []);
  const mergedRef = useMergeRefs([measureRef, forwardedRef]);
  const childWithRef = cloneElement(children, { ref: mergedRef });

  useLayoutEffect(() => {
    if (!active || !root) {
      setRect(null);
      return;
    }

    const measure = () => {
      setRect(root.getBoundingClientRect());
    };

    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();

    return combine(
      addEventListener(window, 'scroll', measure, true),
      addEventListener(window, 'resize', measure),
      () => {
        observer.disconnect();
      },
    );
  }, [root, active]);

  if (!active) {
    return null;
  }

  const padding = 0;
  return (
    <div className='contents'>
      {childWithRef}
      {rect &&
        createPortal(
          <div
            role='none'
            className='z-20 fixed flex flex-col-reverse scrollbar-none overflow-auto pointer-events-none'
            style={{
              top: rect.top + padding,
              left: rect.left + padding,
              width: rect.width - padding * 2,
              height: rect.height - padding * 2,
            }}
          >
            {expand ? (
              <div
                className='absolute inset-0 bg-deckSurface border border-rose-500 cursor-pointer pointer-events-auto overflow-auto'
                onClick={() => setExpand(false)}
              >
                <pre className='p-2 text-xs text-description font-mono font-thin'>
                  {JSON.stringify({ info }, null, 2)}
                </pre>
              </div>
            ) : (
              <span
                className='absolute left-1 bottom-0 flex items-center p-1 text-rose-500 opacity-80 hover:opacity-100 text-xl cursor-pointer pointer-events-auto'
                title={info.id}
                onClick={() => setExpand(true)}
              >
                ⓘ
              </span>
            )}
          </div>,
          // TODO(burdon): Create well-known element for all debug portals.
          document.body,
        )}
    </div>
  );
});
