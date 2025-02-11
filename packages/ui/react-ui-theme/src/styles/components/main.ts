//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction } from '@dxos/react-ui-types';

import { mx } from '../../util';

// Padding to apply to in-flow elements which need to clear the fixed topbar / bottombar.
export const topbarBlockPaddingStart = 'pbs-[--topbar-size] sticky-top-from-topbar-bottom';
export const bottombarBlockPaddingEnd = 'pbe-[--statusbar-size] sticky-bottom-from-statusbar-bottom';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

export const mainSidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('ch-main-sidebar', 'ch-focus-ring-inset-over-all', ...etc);

export const mainPadding = 'ch-main-content-padding';

export const mainPaddingTransitions = 'ch-main-content-padding-transitions';

export const mainContent: ComponentFunction<MainStyleProps> = ({ bounce, handlesFocus }, ...etc) =>
  mx(
    mainPadding,
    mainPaddingTransitions,
    bounce && 'ch-main-bounce-layout',
    handlesFocus && 'ch-focus-ring-inset-over-all',
    ...etc,
  );

export const mainIntrinsicSize = 'ch-main-intrinsic-size';

export const mainOverlay: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('ch-main-overlay', ...etc);

export const mainTheme = {
  content: mainContent,
  sidebar: mainSidebar,
  overlay: mainOverlay,
};
