//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { DataType } from '@dxos/schema';

import { Project } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Project.Create,
      resolve: ({ name }) => ({
        data: { object: DataType.makeProject({ name }) },
      }),
    }),
  );
