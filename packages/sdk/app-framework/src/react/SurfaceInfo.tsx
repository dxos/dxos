//
// Copyright 2025 DXOS.org
//

import React, { type ReactElement, cloneElement, forwardRef, useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const padding = 8;

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
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);

    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [root, active]);

  if (!active) {
    return null;
  }

  // TODO(burdon): Scrolling won't work with pointer-events-none.
  return (
    <div className='contents'>
      {childWithRef}
      {rect &&
        createPortal(
          <div
            role='none'
            className={['z-10 fixed overflow-auto', 'pointer-events-none'].filter(Boolean).join(' ')}
            style={{
              top: rect.top + padding,
              left: rect.left + padding,
              width: rect.width - padding * 2,
              height: rect.height - padding * 2,
            }}
          >
            {/* TODO(burdon): Replace with JsonFilter when extracted into separate react package. */}
            <pre
              onClick={() => setExpand((expand) => !expand)}
              className={[
                'p-1 bg-deckSurface text-xs font-mono font-thin border border-rose-500 cursor-pointer',
                !expand && 'inline-block',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {expand ? JSON.stringify({ info }, null, 2) : info.id}
            </pre>
          </div>,
          // TODO(burdon): Create well-known element for all debug portals.
          document.body,
        )}
    </div>
  );
});
