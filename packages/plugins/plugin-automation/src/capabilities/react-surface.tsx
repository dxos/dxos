//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions/types';
import { getSpace, isEchoObject, type ReactiveEchoObject } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { AutomationPanel } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/automation`,
      role: 'complementary--automation',
      filter: (data): data is { subject: ReactiveEchoObject<any> } =>
        isEchoObject(data.subject) && !!getSpace(data.subject),
      component: ({ data }) => <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/automation`,
      role: 'article',
      filter: (data): data is { subject: ScriptType } =>
        isInstanceOf(ScriptType, data.subject) && data.variant === 'automation',
      component: ({ data, role }) => {
        return (
          <StackItem.Content role={role}>
            <AutomationPanel space={getSpace(data.subject)!} object={data.subject} />
          </StackItem.Content>
        );
      },
    }),
  ]);
