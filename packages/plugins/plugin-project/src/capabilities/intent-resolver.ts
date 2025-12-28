//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';
import { Project } from '@dxos/types';

import { templates } from '../templates';
import { ProjectAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ProjectAction.Create,
      resolve: async ({ db, name, template = 'org-research' }) => {
        if (templates[template]) {
          const project = await templates[template](db);
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
  ),
);
