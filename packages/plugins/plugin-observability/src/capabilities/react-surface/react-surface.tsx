//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { HelpContainer, ObservabilitySettings, type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const settings = useAtomValue(subject.atom) as ObservabilitySettingsProps;
          return <ObservabilitySettings settings={settings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/help`,
        role: 'deck-companion--help',
        component: () => <HelpContainer />,
      }),
    ]),
  ),
);
