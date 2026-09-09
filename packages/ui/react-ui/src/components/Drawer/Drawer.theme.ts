//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type DrawerStyleProps = {
  srOnly?: boolean;
};

const overlay: ComponentFunction<DrawerStyleProps> = (_props, ...etc) => mx('dx-drawer__overlay', ...etc);

const positioner: ComponentFunction<DrawerStyleProps> = (_props, ...etc) => mx('dx-drawer__positioner', ...etc);

const content: ComponentFunction<DrawerStyleProps> = (_props, ...etc) =>
  mx('dx-drawer__content dx-modal-surface dx-focus-ring', ...etc);

const grabber: ComponentFunction<DrawerStyleProps> = (_props, ...etc) =>
  mx('flex shrink-0 justify-center py-2 cursor-grab touch-none', ...etc);

const grabberIndicator: ComponentFunction<DrawerStyleProps> = (_props, ...etc) =>
  mx('w-10 h-1 rounded-full bg-separator', ...etc);

const title: ComponentFunction<DrawerStyleProps> = ({ srOnly }, ...etc) =>
  mx('shrink-0 px-4 text-xl font-medium', srOnly && 'sr-only', ...etc);

const description: ComponentFunction<DrawerStyleProps> = ({ srOnly }, ...etc) =>
  mx('px-4 text-description', srOnly && 'sr-only', ...etc);

const swipeArea: ComponentFunction<DrawerStyleProps> = (_props, ...etc) => mx('dx-drawer__swipe-area', ...etc);

export const drawerTheme: Theme<DrawerStyleProps> = {
  overlay,
  positioner,
  content,
  grabber,
  grabberIndicator,
  title,
  description,
  swipeArea,
};
