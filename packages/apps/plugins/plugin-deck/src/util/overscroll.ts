//
// Copyright 2024 DXOS.org
//

import { type LayoutMode, type LayoutParts } from '@dxos/app-framework';

import { type Overscroll } from '../types';

export const calculateOverscroll = (
  layoutMode: LayoutMode,
  sidebarOpen: boolean,
  complementarySidebarOpen: boolean,
  layoutParts: LayoutParts,
  plankSizing: Record<string, number>,
  overscroll: Overscroll,
) => {
  if (!(layoutMode === 'deck' && overscroll === 'centering')) {
    return;
  }
  if (!layoutParts.main || layoutParts.main.length === 0) {
    return;
  }

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

  // TODO(Zan): Move complementary sidebar size (360px), sidebar size (270px), plank resize handle size (20px) to CSS variables.
  const sidebarWidth = sidebarOpen ? '270px' : '0px';
  const complementarySidebarWidth = complementarySidebarOpen ? '360px' : '0px';

  if (layoutParts.main.length === 1) {
    // Center the plank in the content area.

    const plank = layoutParts.main[0];
    const plankSize = (plankSizing[plank.id] ?? 0).toFixed(2) + 'rem';
    const overscrollPadding = `max(0px, calc(((100dvw - ${sidebarWidth} - ${complementarySidebarWidth} - (${plankSize} + 20px)) / 2)))`;

    return { paddingLeft: overscrollPadding, paddingRight: overscrollPadding };
  } else {
    // Center the plank on the screen.

    const firstPlank = layoutParts.main[0];
    const firstPlankInlineSize = (plankSizing[firstPlank.id] ?? 44).toFixed(2) + 'rem';
    const paddingLeft = `max(0px, calc(((100dvw - (${firstPlankInlineSize} + 20px)) / 2) - ${sidebarWidth}))`;

    const lastPlank = layoutParts.main[layoutParts.main.length - 1];
    const lastPlankInlineSize = (plankSizing[lastPlank.id] ?? 44).toFixed(2) + 'rem';
    const paddingRight = `max(0px, calc(((100dvw - (${lastPlankInlineSize} + 20px)) / 2) - ${complementarySidebarWidth}))`;

    return { paddingLeft, paddingRight };
  }
};
