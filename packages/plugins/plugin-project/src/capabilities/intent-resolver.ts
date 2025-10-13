//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { DataType } from '@dxos/schema';

import { templates } from '../templates';
import { Project } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Project.Create,
      resolve: async ({ space, name, template = 'org-research' }) => {
        if (templates[template]) {
          return {
            data: { object: await templates[template](space) },
          };
        } else {
          return {
            data: { object: DataType.makeProject({ name }) },
          };
        }
      },
    }),
  );
