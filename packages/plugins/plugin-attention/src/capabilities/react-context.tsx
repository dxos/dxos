//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities as AppCapabilities, contributes, useCapability } from '@dxos/app-framework';
import { RootAttentionProvider } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from './capabilities';
import { ATTENTION_PLUGIN } from '../meta';

export default () =>
  contributes(AppCapabilities.ReactContext, {
    id: ATTENTION_PLUGIN,
    context: (props: PropsWithChildren) => {
      const attention = useCapability(AttentionCapabilities.Attention);

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
          {props.children}
        </RootAttentionProvider>
      );
    },
  });
