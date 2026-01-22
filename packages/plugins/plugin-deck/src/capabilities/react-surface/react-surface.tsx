//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';

import { Banner, DeckSettings } from '../../components';
import { meta } from '../../meta';
import { type DeckSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const settings = useAtomValue(subject.atom) as DeckSettingsProps;
          return <DeckSettings settings={settings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/banner`,
        role: 'banner',
        component: ({ data }: { data: { variant?: 'topbar' | 'sidebar' } }) => {
          return <Banner variant={data.variant} />;
        },
      }),
    ]),
  ),
);
