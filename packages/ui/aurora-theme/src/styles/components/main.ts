//
// Copyright 2023 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types/src';

import { mx } from '../../util';
import { baseSurface } from '../fragments';

export type MainStyleProps = Partial<{
  isLg: boolean;
  inlineStartSidebarOpen: boolean;
  inlineEndSidebarOpen: boolean;
  side: 'inline-start' | 'inline-end';
  bounce: boolean;
}>;

export const mainSidebar: ComponentFunction<MainStyleProps> = (
  { inlineStartSidebarOpen, inlineEndSidebarOpen, side },
  ...etc
) =>
  mx(
    'fixed block-start-0 block-end-0 is-[100vw] sm:is-[270px] z-10 overscroll-contain overflow-x-hidden overflow-y-auto',
    'transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
    'border-neutral-200 dark:border-neutral-800',
    side === 'inline-start'
      ? inlineStartSidebarOpen
        ? 'inline-start-0'
        : '-inline-start-[100vw] sm:-inline-start-[270px]'
      : inlineEndSidebarOpen
      ? 'inline-end-0'
      : '-inline-end-[100vw] sm:-inline-end-[270px]',
    side === 'inline-start' ? 'border-ie' : 'border-is',
    baseSurface,
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

export const mainContent: ComponentFunction<MainStyleProps> = (
  { isLg, inlineStartSidebarOpen, inlineEndSidebarOpen, bounce },
  ...etc
) =>
  mx(
    'transition-[padding-inline-start,padding-inline-end] duration-200 ease-in-out',
    isLg && inlineStartSidebarOpen ? 'pis-[270px]' : 'pis-0',
    isLg && inlineEndSidebarOpen ? 'pie-[270px]' : 'pie-0',
    bounce && 'fixed inset-0 z-0 overflow-auto overscroll-auto scroll-smooth',
    ...etc,
  );

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
