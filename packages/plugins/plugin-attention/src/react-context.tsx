//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities as AppCapabilities, contributes, useCapabilities } from '@dxos/app-framework/next';
import { RootAttentionProvider } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from './capabilities';
import { ATTENTION_PLUGIN } from './meta';

export default () =>
  contributes(AppCapabilities.ReactContext, {
    id: ATTENTION_PLUGIN,
    context: (props: PropsWithChildren) => {
      const [attention] = useCapabilities(AttentionCapabilities.Attention);

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
