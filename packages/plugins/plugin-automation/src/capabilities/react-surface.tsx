//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AutomationPanel } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/automation`,
      role: 'space-settings--automation',
      filter: (data): data is { subject: Space } => isSpace(data.subject),
      component: ({ data }) => <AutomationPanel space={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/automation`,
      role: 'article',
      filter: (data): data is { companionTo: ScriptType; subject: 'automation' } =>
        isInstanceOf(ScriptType, data.companionTo) && data.subject === 'automation',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <AutomationPanel space={getSpace(data.companionTo)!} object={data.companionTo} />
          </StackItem.Content>
        );
      },
    }),
  ]);
