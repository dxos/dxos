//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

// Padding to apply to in-flow elements which need to clear the fixed topbar / bottombar.
export const topbarBlockPaddingStart = 'pbs-[--topbar-size] sticky-top-from-topbar-bottom';
export const bottombarBlockPaddingEnd = 'pbe-[--statusbar-size] sticky-bottom-from-statusbar-bottom';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

export const mainSidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('dx-main-sidebar', 'dx-focus-ring-inset-over-all', ...etc);

export const mainPadding = 'dx-main-content-padding';

export const mainPaddingTransitions = 'dx-main-content-padding-transitions';

export const mainContent: ComponentFunction<MainStyleProps> = ({ bounce }, ...etc) =>
  mx(mainPadding, mainPaddingTransitions, bounce && 'dx-main-bounce-layout', 'dx-focus-ring-main', ...etc);

export const mainIntrinsicSize = 'dx-main-intrinsic-size';

export const mainOverlay: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('dx-main-overlay', ...etc);

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
