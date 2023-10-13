//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction } from '@dxos/aurora-types/src';

import { mx } from '../../util';
import { bounceLayout, fixedSurface } from '../fragments';

export type MainStyleProps = Partial<{
  isLg: boolean;
  inlineStartSidebarOpen: boolean;
  inlineEndSidebarOpen: boolean;
  side: 'inline-start' | 'inline-end';
  bounce: boolean;
}>;

// Sidebar widths (used by main and complementary sidebar).
const sidebarSlots = {
  start: {
    width: 'sm:is-[270px]',
    sidebar: 'sm:-inline-start-[270px]',
    content: 'pis-[270px]',
  },
  // TODO(burdon): Maximal size for phone.
  end: {
    width: 'sm:is-[360px]',
    sidebar: 'sm:-inline-end-[360px]',
    content: 'pie-[360px]',
  },
};

export const mainSidebar: ComponentFunction<MainStyleProps> = (
  { inlineStartSidebarOpen, inlineEndSidebarOpen, side },
  ...etc
) =>
  mx(
    'fixed block-start-0 block-end-0 is-[100vw] z-10 overscroll-contain overflow-x-hidden overflow-y-auto',
    'transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
    // TODO(burdon): Coordinate with groupBorder.
    'border-neutral-100 dark:border-neutral-800',
    side === 'inline-start' ? sidebarSlots.start.width : sidebarSlots.end.width,
    side === 'inline-start'
      ? inlineStartSidebarOpen
        ? 'inline-start-0'
        : mx('-inline-start-[100vw]', sidebarSlots.start.sidebar)
      : inlineEndSidebarOpen
      ? 'inline-end-0'
      : mx('-inline-end-[100vw]', sidebarSlots.end.sidebar),
    side === 'inline-start' ? 'border-ie' : 'border-is',
    fixedSurface,
    ...etc,
  );

export const mainContent: ComponentFunction<MainStyleProps> = (
  { isLg, inlineStartSidebarOpen, inlineEndSidebarOpen, bounce },
  ...etc
) =>
  mx(
    'transition-[padding-inline-start,padding-inline-end] duration-200 ease-in-out',
    isLg && inlineStartSidebarOpen ? sidebarSlots.start.content : 'pis-0',
    isLg && inlineEndSidebarOpen ? sidebarSlots.end.content : 'pie-0',
    bounce && bounceLayout,
    ...etc,
  );

export const mainOverlay: ComponentFunction<MainStyleProps> = (
  { isLg, inlineStartSidebarOpen, inlineEndSidebarOpen, side },
  ...etc
) =>
  mx(
    'fixed inset-0 z-[9] bg-transparent',
    'transition-opacity duration-200 ease-in-out',
    !isLg && (inlineStartSidebarOpen || inlineEndSidebarOpen) ? 'opacity-100' : 'opacity-0',
    !isLg && (inlineStartSidebarOpen || inlineEndSidebarOpen) ? 'block' : 'hidden',
    ...etc,
  );

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
