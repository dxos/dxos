//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import {
  type AttentionManager,
  RootAttentionProvider,
  type SelectionManager,
  SelectionProvider,
} from '@dxos/react-ui-attention';

import { meta } from '../../meta';
import { AttentionCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactContext, {
      id: meta.id,
      context: (props: PropsWithChildren) => {
        const attention = useCapability(AttentionCapabilities.Attention) as AttentionManager | undefined;
        const selection = useCapability(AttentionCapabilities.Selection) as SelectionManager | undefined;

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
    }),
  ),
);
