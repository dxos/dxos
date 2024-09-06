//
// Copyright 2024 DXOS.org
//

import type { CSSProperties } from 'react';

import { type LayoutEntry } from '@dxos/app-framework';
import { PLANK_DEFAULTS } from '@dxos/react-ui-deck';

/**
 * ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
 * | Overscroll Padding Calculation for Centering Planks on Screen.                                     │
 * ├────────────────────────────────────────────────────────────────────────────────────────────────────┤
 * │ NOTE(Zan): I found the way you calculate the overscroll padding to center a plank on the screen    │
 * │ at the edges of the scroll context a bit confusing, so I've diagrammed it here.                    │
 * │                                                                                                    │
 * │ Multiple Planks:                                                                                   │
 * │ ───────────────                                                                                    │
 * | Use the following overscroll padding calculation centering the boundary planks on the SCREEN.      │
 * │                                                                                                    │
 * │ Left Padding:                           Right Padding:                                             │
 * │ ┌───┬────┬──────────────────┬──────┐    ┌──────┬──────────────────┬────┬───┐                       │
 * │ │   │████│     Ideal        │      │    │      │      Ideal       │████│   │                       │
 * │ │ S │█PL█│     first        │      │    │      │      last        │█PR█│ C │                       │
 * │ │   │████│     plank        │      │    │      │      plank       │████│   │                       │
 * │ └───┴────┴──────────────────┴──────┘    └──────┴──────────────────┴────┴───┘                       │
 * │ <--------- screen width ----------->    <---------- screen width ---------->                       │
 * │                                                                                                    │
 * │ PL = ((screen width - Plank Width) / 2) - S                                                        │
 * │ PR = ((screen width - Plank Width) / 2) - C                                                        │
 * │                                                                                                    │
 * │ S  = Sidebar width                     C  = Complementary sidebar width                            │
 * │ PL = Padding Left                      PR = Padding Right                                          │
 * │                                                                                                    │
 * │ Single Plank:                                                                                      │
 * │ ─────────────                                                                                      │
 * │ For a single plank we use the following overscroll padding calculation to center the plank in      │
 * │ the content area:                                                                                  │
 * │                                                                                                    │
 * │ ┌───┬───────────────────────┬───┬───────────────────────┬───┐                                      │
 * │ │   │███████████████████████│   │███████████████████████│   │                                      │
 * │ │ S │█████ Left Padding ████│ P │████ Right Padding ████│ C │                                      │
 * │ │   │███████████████████████│   │███████████████████████│   │                                      │
 * │ └───┴───────────────────────┴───┴───────────────────────┴───┘                                      │
 * │ <------------------------ screen width --------------------->                                      │
 * │                                                                                                    │
 * │ Left/Right Padding Width = (screen width - S - P - C) / 2                                          │
 * │                                                                                                    │
 * │ S = Sidebar width (may be 0)                                                                       │
 * │ P = Plank width (centered)                                                                         │
 * │ C = Complementary sidebar width (may be 0)                                                         │
 * └────────────────────────────────────────────────────────────────────────────────────────────────────┘
 */
export const calculateOverscroll = (
  planks: LayoutEntry[] | undefined,
  plankSizing: Record<string, number>,
  sidebarOpen: boolean,
  complementarySidebarOpen: boolean,
): Pick<CSSProperties, 'paddingLeft' | 'paddingRight'> | undefined => {
  if (!planks?.length) {
    return;
  }

  // TODO(Zan): Move complementary sidebar size (360px), sidebar size (270px), plank resize handle size (20px) to CSS variables.
  const sidebarWidth = sidebarOpen ? '270px' : '0px';
  const complementarySidebarWidth = complementarySidebarOpen ? '360px' : '0px';

  const getPlankSize = (id: string) => (plankSizing[id] ?? PLANK_DEFAULTS.size).toFixed(2) + 'rem';

  if (planks.length === 1) {
    // Center the plank in the content area.
    const plank = planks[0];
    const plankSize = getPlankSize(plank.id);
    const overscrollPadding = `max(0px, calc(((100dvw - ${sidebarWidth} - ${complementarySidebarWidth} - (${plankSize} + 20px)) / 2)))`;

    return { paddingLeft: overscrollPadding, paddingRight: overscrollPadding };
  } else {
    // Center the plank on the screen.
    const first = planks[0];
    const firstSize = getPlankSize(first.id);

    const last = planks[planks.length - 1];
    const lastSize = getPlankSize(last.id);

    return {
      paddingLeft: `max(0px, calc(((100dvw - (${firstSize} + 20px)) / 2) - ${sidebarWidth}))`,
      paddingRight: `max(0px, calc(((100dvw - (${lastSize} + 20px)) / 2) - ${complementarySidebarWidth}))`,
    };
  }
};
