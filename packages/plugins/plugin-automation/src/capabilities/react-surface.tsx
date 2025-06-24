//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useLayout } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { getSpace, parseId, useSpace } from '@dxos/react-client/echo';

import { AutomationContainer, FunctionsContainer } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/space-settings-automation`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings-automation`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);
        if (!space || !spaceId) {
          return null;
        }

        return <AutomationContainer space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/space-settings-functions`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings-functions`,
      component: () => {
        const layout = useLayout();
        const { spaceId } = parseId(layout.workspace);
        const space = useSpace(spaceId);
        if (!space || !spaceId) {
          return null;
        }

        return <FunctionsContainer space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/companion/automation`,
      role: 'article',
      filter: (data): data is { companionTo: ScriptType; subject: 'automation' } =>
        Obj.instanceOf(ScriptType, data.companionTo) && data.subject === 'automation',
      component: ({ data, role }) => {
        return <AutomationContainer space={getSpace(data.companionTo)!} object={data.companionTo} />;
      },
    }),
  ]);
