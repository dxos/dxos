//
// Copyright 2022 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui';

// TODO(burdon): Change to semantic tokens.
export const defaultGridStyles = (themeMode: ThemeMode) =>
  themeMode === 'dark'
    ? '[&>path.axis]:stroke-neutral-700 [&>path.major]:stroke-neutral-800 [&>path.minor]:stroke-neutral-850'
    : '[&>path.axis]:stroke-neutral-200 [&>path.major]:stroke-neutral-200 [&>path.minor]:stroke-neutral-150';
