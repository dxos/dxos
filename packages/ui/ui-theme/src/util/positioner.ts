//
// Copyright 2026 DXOS.org
//

/**
 * A Zag positioner moves with `translate3d(var(--x), var(--y), 0)`, but the machine sets the two
 * variables only once its deferred measurement lands, a frame after the element mounts, and an
 * undefined variable voids the transform: that frame paints at the viewport's origin. Defaults keep
 * the unmeasured frame off screen, where the machine parks a positioner that has no placement yet.
 */
export const positionerUnplaced = '[--x:-100vw] [--y:-100vh]';
