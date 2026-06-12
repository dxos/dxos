//
// Copyright 2025 DXOS.org
//

import { useLayoutEffect, useMemo } from 'react';

export const useViewportResize = (
  cb: (event?: Event) => void,
  deps: Parameters<typeof useLayoutEffect>[1] = [],
  delay: number = 800,
) => {
  // The cleanup must cancel the pending debounce timeout. Otherwise, if the
  // component unmounts during the `delay` window (common in jsdom/happy-dom
  // test teardown), the callback fires against a torn-down DOM and surfaces
  // as `ReferenceError: getComputedStyle is not defined`.
  const { handler: debouncedHandler, cancel } = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return {
      handler: (event?: Event) => {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = undefined;
          // The debounced callback can outlive the DOM realm: in jsdom/happy-dom test runs the
          // timer survives environment teardown (e.g. story roots that are never unmounted), and
          // callbacks here read DOM globals such as `getComputedStyle`. Skip dispatch once the
          // realm is gone.
          if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
            return;
          }
          cb(event);
        }, delay);
      },
      cancel: () => {
        if (timeout !== undefined) {
          clearTimeout(timeout);
          timeout = undefined;
        }
      },
    };
  }, [cb, delay]);

  return useLayoutEffect(() => {
    window.visualViewport?.addEventListener('resize', debouncedHandler);
    debouncedHandler();
    return () => {
      window.visualViewport?.removeEventListener('resize', debouncedHandler);
      cancel();
    };
  }, [debouncedHandler, cancel, ...deps]);
};
