//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type breadcrumbStyleProps = {};

const root: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) =>
  mx('flex items-center grow overflow-hidden', ...etc);

const list: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) =>
  mx('flex items-center min-w-0 grow overflow-x-auto scrollbar-none', ...etc);

const listItem: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('flex items-center shrink-0', ...etc);

const current: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('whitespace-nowrap', ...etc);

const separator: ComponentFunction<breadcrumbStyleProps> = (_props, ...etc) => mx('shrink-0 opacity-50', ...etc);

export const breadcrumbTheme: Theme<breadcrumbStyleProps> = {
  root,
  list,
  listItem,
  current,
  separator,
};
