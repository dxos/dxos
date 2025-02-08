//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { DeckCapabilities } from './capabilities';
import { LayoutContext } from '../components';
import { DECK_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: DECK_PLUGIN,
    context: (props: PropsWithChildren) => {
      const layout = useCapability(DeckCapabilities.MutableDeckState);

      return <LayoutContext.Provider value={layout}>{props.children}</LayoutContext.Provider>;
    },
  });
