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

/**
 * Debug wrapper for surfaces.
 */
export const SurfaceInfo = forwardRef<HTMLElement, SurfaceInfoProps>(({ children }, forwardedRef) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [expand, setExpand] = useState(false);
  const info = useSurface();

  const [root, setRoot] = useState<HTMLElement | null>(null);
  const measureRef = useCallback((node: HTMLElement | null) => setRoot(node), []);
  const mergedRef = useMergeRefs([measureRef, forwardedRef]);
  const childWithRef = cloneElement(children, { ref: mergedRef });

  useLayoutEffect(() => {
    if (!root) {
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
  }, [root]);

  const padding = 0;
  return (
    <>
      {childWithRef}
      {rect &&
        createPortal(
          <div
            role='none'
            className='z-[100] fixed flex flex-col-reverse scrollbar-none overflow-auto pointer-events-none'
            style={{
              top: rect.top + padding,
              left: rect.left + padding,
              width: rect.width - padding * 2,
              height: rect.height - padding * 2,
            }}
          >
            {expand ? (
              <div
                className='absolute inset-0 bg-deckSurface border border-green-500 cursor-pointer pointer-events-auto overflow-auto'
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setExpand(false);
                }}
              >
                <pre className='p-2 text-xs text-description font-mono'>{JSON.stringify({ info }, null, 2)}</pre>
              </div>
            ) : (
              <span
                className='absolute right-1 bottom-0 flex items-center p-1 text-green-500 opacity-80 hover:opacity-100 text-xl cursor-pointer pointer-events-auto'
                title={info.id}
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setExpand(true);
                }}
              >
                ⓘ
              </span>
            )}
          </div>,
          // TODO(burdon): Create well-known element to gather all debug portals.
          document.body,
        )}
    </>
  );
});
