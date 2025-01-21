//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { DeckContext, LayoutContext } from '../../components';
import { DECK_PLUGIN } from '../../meta';
import { DeckCapabilities } from '../capabilities';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: DECK_PLUGIN,
    context: (props: PropsWithChildren) => {
      const layout = useCapability(Capabilities.Layout);
      const deck = useCapability(DeckCapabilities.MutableDeckState);

      return (
        <LayoutContext.Provider value={layout}>
          <DeckContext.Provider value={deck}>{props.children}</DeckContext.Provider>
        </LayoutContext.Provider>
      );
    },
  });
