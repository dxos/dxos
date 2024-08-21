import { LayoutMode, LayoutParts } from '@dxos/app-framework';
import { Overscroll } from '../types';

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
   * NOTE(Zan): I found the way you calculate the overscroll padding to center a plank on the screen at
   * the edges of the scroll context a bit confusing, so I've diagrammed it here.
   *
   * Left Padding                                    Right Padding
   * +-----+----+--------------------+--------+      +--------+------------------+----+-----+
   * |     |####|  Ideal first plank |        |      |        | Ideal last plank |####|     |
   * |     |####|     position       |        |      |        |    position      |####|     |
   * |  S  | PL |  (center screen)   |        |      |        | (center screen)  | PR |  C  |
   * |     |####|                    |        |      |        |                  |####|     |
   * +-----+----+--------------------+--------+      +--------+------------------+----+-----+
   * <------------ screen width -------------->      <----------- screen width ------------->
   *
   * PL = ((screen width - Plank Width) / 2) - S     PR = ((screen width - Plank Width) / 2) - C
   *
   * S  = Sidebar width                              C  = Complementary sidebar width
   * PL = Padding Left                               PR = Padding Right
   */

  // TODO(Zan): Move complementary sidebar size (360px), sidebar size (270px), plank resize handle size (20px) to CSS variables.
  const sidebarWidth = sidebarOpen ? '270px' : '0px';
  const complementarySidebarWidth = complementarySidebarOpen ? '360px' : '0px';

  const firstPlank = layoutParts.main[0];
  const firstPlankInlineSize = (plankSizing[firstPlank.id] ?? 0).toFixed(2) + 'rem';
  const overscrollPaddingLeft = `max(0px, calc(((100dvw - (${firstPlankInlineSize} + 20px)) / 2) - ${sidebarWidth}))`;

  const lastPlank = layoutParts.main[layoutParts.main.length - 1];
  const lastPlankInlineSize = (plankSizing[lastPlank.id] ?? 0).toFixed(2) + 'rem';
  const overscrollPaddingRight = `max(0px, calc(((100dvw - (${lastPlankInlineSize} + 20px)) / 2) - ${complementarySidebarWidth}))`;

  return {
    paddingLeft: overscrollPaddingLeft,
    paddingRight: overscrollPaddingRight,
  };
};
