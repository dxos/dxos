//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { bounceLayout, fixedBorder, fixedSurface } from '../fragments';

// Padding to apply to in-flow elements which need to clear the fixed topbar / bottombar.
export const topbarBlockPaddingStart = 'pbs-[--topbar-size] sticky-top-from-topbar-bottom';
export const bottombarBlockPaddingEnd = 'pbe-[--statusbar-size] sticky-bottom-from-statusbar-bottom';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

export const mainSidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed block-start-0 block-end-0 is-[100vw] z-[7] data-[side=is]:z-[8] overscroll-contain overflow-x-hidden overflow-y-auto',
    'transition-[inset-inline-start,inset-inline-end] duration-200 data-[resizing=false]:duration-200 ease-in-out-symmetric',
    'data-[side=is]:-inline-start-[100vw] sm:data-[side=is]:is-[--nav-sidebar-size] sm:data-[side=is]:-inline-start-[--nav-sidebar-size]',
    'data-[side=ie]:-inline-end-[100vw] sm:data-[side=ie]:is-[--complementary-sidebar-size] sm:data-[side=ie]:-inline-end-[--complementary-sidebar-size]',
    'data-[side=is]:data-[state=open]:inline-start-0 data-[side=ie]:data-[state=open]:inline-end-0',
    'data-[side=is]:border-ie data-[side=ie]:border-is',
    'ch-focus-ring-inset-over-all',
    fixedBorder,
    fixedSurface,
    ...etc,
  );

export const mainPadding = mx(
  'pis-0 scroll-ps-0 lg:data-[sidebar-inline-start-state=open]:pis-[--nav-sidebar-size]',
  'lg:data-[sidebar-inline-start-state=open]:scroll-ps-[--nav-sidebar-size]',
  'pie-0 scroll-pe-0 lg:data-[sidebar-inline-end-state=open]:pie-[--complementary-sidebar-size]',
  'lg:data-[sidebar-inline-end-state=open]:scroll-pe-[--complementary-sidebar-size]',
);

export const mainPaddingTransitions =
  'transition-[padding-inline-start,padding-inline-end,scroll-padding-start,scroll-padding-end] duration-200 ease-in-out-symmetric';

export const mainContent: ComponentFunction<MainStyleProps> = ({ bounce, handlesFocus }, ...etc) =>
  mx(mainPadding, mainPaddingTransitions, handlesFocus && 'ch-focus-ring-main', bounce && bounceLayout, ...etc);

export const mainIntrinsicSize = mx(
  'is-dvw transition-[inline-size] ease-in-out-symmetric duration-200 lg:data-[sidebar-inline-start-state=open]:is-[calc(100dvw-var(--nav-sidebar-size))]',
  'lg:data-[sidebar-inline-end-state=open]:is-[calc(100dvw-var(--complementary-sidebar-size))]',
  'lg:data-[sidebar-inline-start-state=open]:data-[sidebar-inline-end-state=open]:is-[calc(100dvw-var(--nav-sidebar-size)-var(--complementary-sidebar-size))]',
);

export const mainOverlay: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed inset-0 z-[6] bg-scrim',
    'transition-opacity duration-200 ease-in-out-symmetric',
    'opacity-0 data-[state=open]:opacity-100 lg:data-[state=open]:opacity-100',
    'hidden data-[state=open]:block lg:data-[state=open]:hidden',
    ...etc,
  );

export const mainNotch: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx(
    'fixed z-[9] block-end-0 inline-start-0 pbe-[env(safe-area-inset-bottom)] rounded-se-lg min-bs-[var(--rail-size)] is-fit border-separator bg-base',
    'transition-[border-width] box-content border-bs border-ie data-[nav-sidebar-state=open]:border-bs-0 data-[nav-sidebar-state=open]:border-ie-0',
    'pis-1 grid grid-cols-[repeat(auto-fit,var(--rail-action))]',
    'max-is-[--nav-sidebar-size] ch-focus-ring-inset focus-visible:!z-[9]',
    ...etc,
  );

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
  notch: mainNotch,
};
