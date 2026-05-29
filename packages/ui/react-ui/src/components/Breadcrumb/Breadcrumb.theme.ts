//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type breadcrumbStyleProps = {};

const root: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('shrink-0 flex items-center', ...etc);

const list: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('contents', ...etc);

const listItem: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('contents', ...etc);

const current: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx(...etc);

const separator: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('opacity-50', ...etc);

export const breadcrumbTheme: Theme<breadcrumbStyleProps> = {
  root,
  list,
  listItem,
  current,
  separator,
};
