//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
import React, { forwardRef } from 'react';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _floater from 'react-floater';
import { type Props, type TooltipRenderProps } from 'react-joyride';
// TODO(thure): This needed to be imported in the package.json specifically to pacify TS2742. See if this is resolved with typescript@5.5.x.
// eslint-disable-next-line unused-imports/no-unused-imports
import _typefest from 'type-fest';

import { Button, Icon, IconButton } from '@dxos/react-ui';

// Kept out of `Tooltip.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

// https://docs.react-joyride.com/styling
// https://github.com/gilbarbara/react-floater
export const floaterProps: Props['floaterProps'] = {
  styles: {
    // Arrow color is set by joyride.
    arrow: {
      length: 8,
      spread: 16,
    },
    floater: {
      // TODO(burdon): Get tokens from theme.
      filter: 'drop-shadow(0 0 0.75rem rgba(0, 0, 0, 0.2))',
    },
  },
};
