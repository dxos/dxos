//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { type ReactiveEchoObject } from '@dxos/react-client/echo';

import { TemplateContainer } from '../components';
import { TEMPLATE_PLUGIN } from '../meta';
import { isObject } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: TEMPLATE_PLUGIN,
      role: 'article',
      filter: (data): data is { subject: ReactiveEchoObject<any> } => isObject(data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} object={data.subject} />,
    }),
  );
