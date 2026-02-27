//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getSpace, parseId, useSpace } from '@dxos/react-client/echo';

import { AutomationSettings, FunctionsContainer } from '../../containers';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/space-settings-functions`,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings-functions`,
        component: () => {
          const layout = useLayout();
          const { spaceId } = parseId(layout.workspace);
          const space = useSpace(spaceId);
          if (!space) {
            return null;
          }

          return <FunctionsContainer space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/space-settings-automation`,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings-automation`,
        component: () => {
          const layout = useLayout();
          const { spaceId } = parseId(layout.workspace);
          const space = useSpace(spaceId);
          if (!space) {
            return null;
          }

          return <AutomationSettings space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/companion/automation`,
        role: 'article',
        filter: (data): data is { companionTo: Obj.Unknown; subject: 'automation' } =>
          Obj.isObject(data.companionTo) && data.subject === 'automation',
        component: ({ data }) => {
          return <AutomationSettings space={getSpace(data.companionTo)!} object={data.companionTo} />;
        },
      }),
    ]),
  ),
);
