//
// Copyright 2024 DXOS.org
//

import type { CSSProperties } from 'react';

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
  planksCount: number,
): Pick<CSSProperties, 'paddingInlineStart' | 'paddingInlineEnd'> | undefined => {
  if (!planksCount) {
    return { paddingInlineStart: 0, paddingInlineEnd: 0 };
  }
  if (planksCount === 1) {
    const overscrollPadding =
      'max(0px, calc(((100dvw - var(--dx-main-sidebar-width) - var(--dx-main-complementary-width) - (var(--dx-main-content-first-width) + 1px)) / 2)))';
    return { paddingInlineStart: overscrollPadding, paddingInlineEnd: overscrollPadding };
  } else {
    return {
      paddingInlineStart:
        'max(0px, calc(((100dvw - (var(--dx-main-content-first-width) + 1px)) / 2) - var(--dx-main-sidebar-width)))',
      paddingInlineEnd:
        'max(0px, calc(((100dvw - (var(--dx-main-content-last-width) + 1px)) / 2) - var(--dx-main-complementary-width)))',
    };
  }
};
