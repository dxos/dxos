//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { RootAttentionProvider, SelectionProvider } from '@dxos/react-ui-attention';

import { meta } from '../meta';

import { AttentionCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: meta.id,
    context: (props: PropsWithChildren) => {
      const attention = useCapability(AttentionCapabilities.Attention);
      const selection = useCapability(AttentionCapabilities.Selection);

      return (
        <RootAttentionProvider
          attention={attention}
          onChange={(nextAttended) => {
            // TODO(Zan): Workout why this was in deck plugin. It didn't seem to work?
            // if (layout.values.scrollIntoView && nextAttended.has(layout.values.scrollIntoView)) {
            //   layout.values.scrollIntoView = undefined;
            // }
          }}
        >
          <SelectionProvider selection={selection}>{props.children}</SelectionProvider>
        </RootAttentionProvider>
      );
    },
  });
