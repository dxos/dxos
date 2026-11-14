//
// Copyright 2026 DXOS.org
//

import { useEffect, useState, useSyncExternalStore } from 'react';

const root = () => document.documentElement;

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

/** Follows the `dark` class that the docs head mirrors from Starlight's theme picker. */
export const useThemeMode = () =>
  useSyncExternalStore(subscribe, () => (root().classList.contains('dark') ? 'dark' : 'light'));

/** True once `element` has come within a screen of the viewport; it stays true. */
export const useNearViewport = (element: HTMLElement | null, enabled: boolean) => {
  const [near, setNear] = useState(!enabled);
  useEffect(() => {
    if (!element || near) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && setNear(true),
      { rootMargin: '100% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, near]);
  return near;
};
