//
// Copyright 2026 DXOS.org
//

import { createContext, useContext, useEffect } from 'react';

/**
 * How a slide tells the canvas around it what to paint the scrim. The scrim is outside the slide — the inset void in
 * the editor, the letterbox bands when presenting — so it belongs to the canvas, while the color that names it is the
 * slide's own frontmatter, two levels in. Its own module, so the slide and the canvas share it without importing
 * each other.
 */
export const ScrimContext = createContext<(scrim: string | undefined) => void>(() => {});

/** Publishes `scrim` to the canvas around this slide for as long as the slide is mounted. */
export const useSlideScrim = (scrim: string | undefined): void => {
  const setScrim = useContext(ScrimContext);
  useEffect(() => {
    setScrim(scrim);
    // Cleared on unmount, so a slide that names no scrim does not keep the last one's.
    return () => setScrim(undefined);
  }, [scrim, setScrim]);
};
