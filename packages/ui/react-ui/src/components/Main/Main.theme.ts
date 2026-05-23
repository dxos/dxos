//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { mainPaddingTransitions } from './constants';

const padding = 'dx-main-content-padding';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

const content: ComponentFunction<MainStyleProps> = ({ bounce }, ...etc) =>
  mx(padding, mainPaddingTransitions, bounce && 'dx-main-bounce-layout', 'dx-focus-ring-main', ...etc);

const sidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('dx-main-sidebar', 'dx-focus-ring-inset-over-all', ...etc);

const overlay: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('dx-main-overlay', ...etc);

export const mainTheme = {
  content,
  sidebar,
  overlay,
};
