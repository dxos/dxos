//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Project } from '@dxos/types';

import { templates } from '../templates';
import { ProjectAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ProjectAction.Create,
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
          data: { object: Project.make({ name }) },
        };
      },
    }),
  );
