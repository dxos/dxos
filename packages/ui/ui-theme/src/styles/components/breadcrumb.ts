//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type breadcrumbStyleProps = {};

export const breadcrumbRoot: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) =>
  mx('shrink-0 flex items-center', ...etc);

export const breadcrumbList: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('contents', ...etc);

export const breadcrumbListItem: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('contents', ...etc);

export const breadcrumbCurrent: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx(...etc);

export const breadcrumbSeparator: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) =>
  mx('opacity-50', ...etc);

export const breadcrumbTheme: Theme<breadcrumbStyleProps> = {
  root: breadcrumbRoot,
  list: breadcrumbList,
  listItem: breadcrumbListItem,
  current: breadcrumbCurrent,
  separator: breadcrumbSeparator,
};
