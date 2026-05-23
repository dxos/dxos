//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { mainPaddingTransitions } from './constants';

const mainPadding = 'dx-main-content-padding';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

const mainContent: ComponentFunction<MainStyleProps> = ({ bounce }, ...etc) =>
  mx(mainPadding, mainPaddingTransitions, bounce && 'dx-main-bounce-layout', 'dx-focus-ring-main', ...etc);

const mainSidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('dx-main-sidebar', 'dx-focus-ring-inset-over-all', ...etc);

const mainOverlay: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('dx-main-overlay', ...etc);

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
