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
          const project = await templates[template](space);
          if (project) {
            return {
              data: { object: project },
            };
          }
        }

        return {
          data: { object: DataType.makeProject({ name }) },
        };
      },
    }),
  );
