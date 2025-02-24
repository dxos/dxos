//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { CallCapabilities } from './capabilities';
import { RootCallProvider } from '../components/RootCallProvider';
import { CALLS_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: CALLS_PLUGIN,
    context: (props: PropsWithChildren) => {
      const call = useCapability(CallCapabilities.Call);

      return <RootCallProvider call={call}>{props.children}</RootCallProvider>;
    },
  });
