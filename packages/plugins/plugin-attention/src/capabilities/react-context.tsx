//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { RootAttentionProvider, ViewStateProvider } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { AttentionCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: (props: PropsWithChildren) => {
        const attention = useCapability(AttentionCapabilities.Attention);
        const viewState = useCapability(AttentionCapabilities.ViewState);

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
            <ViewStateProvider manager={viewState}>{props.children}</ViewStateProvider>
          </RootAttentionProvider>
        );
      },
    }),
  ),
);
