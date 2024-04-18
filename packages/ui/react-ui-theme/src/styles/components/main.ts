//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction } from '@dxos/react-ui-types/src';

import { mx } from '../../util';
import { bounceLayout, fixedBorder, fixedSurface } from '../fragments';

// Padding to apply to in-flow elements which need to clear the fixed topbar.
export const topbarBlockPaddingStart = 'pbs-[--topbar-size] sticky-top-from-topbar-bottom';

export type MainStyleProps = Partial<{
  bounce: boolean;
}>;

// Sidebar widths (used by main and complementary sidebar).
const sidebarSlots = {
  start: {
    width: 'sm:data-[side=is]:is-[270px]',
    sidebar: 'sm:data-[side=is]:-inline-start-[270px]',
    content:
      'lg:data-[sidebar-inline-start-state=open]:pis-[270px] lg:data-[sidebar-inline-start-state=open]:scroll-ps-[270px]',
    notch: 'max-is-[270px]',
  },
  // TODO(burdon): Maximal size for phone.
  end: {
    width: 'sm:data-[side=ie]:is-[360px]',
    sidebar: 'sm:data-[side=ie]:-inline-end-[360px]',
    content:
      'lg:data-[sidebar-inline-end-state=open]:pie-[360px] lg:data-[sidebar-inline-end-state=open]:scroll-pe-[360px]',
  },
};

export const mainSidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed block-start-0 block-end-0 is-[100vw] z-10 data-[side=ie]:z-20 overscroll-contain overflow-x-hidden overflow-y-auto',
    'transition-[inset-inline-start,inset-inline-end] duration-0 data-[resizing=false]:duration-200 ease-in-out',
    `data-[side=is]:-inline-start-[100vw] ${sidebarSlots.start.width} ${sidebarSlots.start.sidebar}`,
    `data-[side=ie]:-inline-end-[100vw] ${sidebarSlots.end.width} ${sidebarSlots.end.sidebar}`,
    'data-[side=is]:data-[state=open]:inline-start-0 data-[side=ie]:data-[state=open]:inline-end-0',
    'data-[side=is]:border-ie data-[side=ie]:border-is',
    fixedBorder,
    fixedSurface,
    ...etc,
  );

export const mainContent: ComponentFunction<MainStyleProps> = ({ bounce }, ...etc) =>
  mx(
    "transition-[padding-inline-start,padding-'inline-end'] duration-200 ease-in-out",
    `pis-0 ${sidebarSlots.start.content}`,
    `pie-0 ${sidebarSlots.end.content}`,
    bounce && bounceLayout,
    ...etc,
  );

export const mainOverlay: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed inset-0 z-[9] surface-scrim',
    'transition-opacity duration-200 ease-in-out',
    'opacity-0 data-[state=open]:opacity-100 lg:data-[state=open]:opacity-100',
    'hidden data-[state=open]:block lg:data-[state=open]:hidden',
    ...etc,
  );

export const mainNotch: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed z-[11] block-end-0 inline-start-0 pbe-[env(safe-area-inset-bottom)] rounded-se-lg min-bs-[var(--rail-size)] is-fit separator-separator surface-base',
    'transition-[border-width] box-content border-bs border-ie data-[nav-sidebar-state=open]:border-bs-0 data-[nav-sidebar-state=open]:border-ie-0',
    'pli-1 grid grid-cols-[repeat(auto-fit,var(--rail-action))]',
    sidebarSlots.start.notch,
    ...etc,
  );

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
  notch: mainNotch,
};
