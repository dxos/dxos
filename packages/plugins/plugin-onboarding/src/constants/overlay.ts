//
// Copyright 2026 DXOS.org
//

import hero from '../../assets/hero.webp?url';

/**
 * Dialog-overlay styling for the welcome screen. Apart from the screen itself so the onboarding
 * manager — which runs in every tab to decide whether onboarding is needed — can reference the
 * overlay without pulling the screen's component tree into its chunk.
 */
export const OVERLAY_CLASSES = 'dark bg-neutral-950! bg-no-repeat bg-center';

export const OVERLAY_STYLE = { backgroundImage: `url(${hero})` };
