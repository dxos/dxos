//
// Copyright 2022 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui';

export const defaultGridStyles = (themeMode: ThemeMode) =>
  themeMode === 'dark'
    ? '[&>path.axis]:stroke-neutral-600 [&>path.major]:stroke-neutral-700 [&>path.minor]:stroke-neutral-750'
    : '[&>path.axis]:stroke-neutral-300 [&>path.major]:stroke-neutral-200 [&>path.minor]:stroke-neutral-50';
