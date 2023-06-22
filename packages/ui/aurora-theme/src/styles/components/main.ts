//
// Copyright 2023 DXOS.org
//

import { ComponentFunction } from '@dxos/aurora-types/src';

import { mx } from '../../util';
import { surfaceElevation } from '../fragments';

export type MainStyleProps = Partial<{
  isLg: boolean;
  sidebarOpen: boolean;
}>;

export const mainSidebar: ComponentFunction<MainStyleProps> = ({ isLg, sidebarOpen }, ...etc) =>
  mx(
    'fixed block-start-0 block-end-0 is-[100vw] sm:is-[270px] z-10 overscroll-contain overflow-x-hidden overflow-y-auto bg-neutral-50 dark:bg-neutral-850',
    'transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
    sidebarOpen ? 'inline-start-0' : '-inline-start-[100vw] sm:-inline-start-[270px]',
    sidebarOpen && surfaceElevation({ elevation: 'chrome' }),
    ...etc,
  );

export const mainOverlay: ComponentFunction<MainStyleProps> = ({ isLg, sidebarOpen }, ...etc) =>
  mx(
    'fixed inset-0 z-[9] bg-transparent',
    'transition-opacity duration-200 ease-in-out',
    !isLg && sidebarOpen ? 'opacity-100' : 'opacity-0',
    !isLg && sidebarOpen ? 'block' : 'hidden',
    ...etc,
  );

export const mainContent: ComponentFunction<MainStyleProps> = ({ isLg, sidebarOpen }, ...etc) =>
  mx(
    'transition-[padding-inline-start] duration-200 ease-in-out',
    isLg && sidebarOpen ? 'pis-[270px]' : 'pis-0',
    ...etc,
  );

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
