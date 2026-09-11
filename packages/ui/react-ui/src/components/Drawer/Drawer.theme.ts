//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type DrawerStyleProps = {
  srOnly?: boolean;
  push?: boolean;
};

const overlay: ComponentFunction<DrawerStyleProps> = (_props, ...etc) => mx('dx-drawer__overlay', ...etc);

const positioner: ComponentFunction<DrawerStyleProps> = ({ push }, ...etc) =>
  mx(push ? 'dx-drawer__positioner--push' : 'dx-drawer__positioner', ...etc);

// A pushed panel sits on the page's own surface: it is part of the layout, not a layer above it.
const content: ComponentFunction<DrawerStyleProps> = ({ push }, ...etc) =>
  mx('dx-drawer__content dx-focus-ring', push ? 'dx-drawer__content--push' : 'dx-modal-surface', ...etc);

const grabber: ComponentFunction<DrawerStyleProps> = (_props, ...etc) =>
  mx('flex shrink-0 justify-center py-2 cursor-grab touch-none', ...etc);

const grabberIndicator: ComponentFunction<DrawerStyleProps> = (_props, ...etc) =>
  mx('w-10 h-1 rounded-full bg-separator', ...etc);

const title: ComponentFunction<DrawerStyleProps> = ({ srOnly }, ...etc) =>
  mx('shrink-0 px-2 text-xl font-medium', srOnly && 'sr-only', ...etc);

const description: ComponentFunction<DrawerStyleProps> = ({ srOnly }, ...etc) =>
  mx('px-3 text-description', srOnly && 'sr-only', ...etc);

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
