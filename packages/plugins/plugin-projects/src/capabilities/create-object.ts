//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation, Project } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateProjectPanel } from '#components';
import { ProjectOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

/**
 * Contributes the "create Project" entry so a new `Project` can be created from the nav menu (the
 * Projects type-section `+` action). The panel offers contributed project templates (blank by
 * default); `ProjectOperation.Create` runs the chosen template's scaffold, which materializes the
 * owned instructions and artifacts collection.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Project.Project),
      customPanel: CreateProjectPanel,
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Effect.gen(function* () {
          const { id, subject, project } = yield* Operation.invoke(
            ProjectOperation.Create,
            { name, templateId },
            { spaceId: options.db.spaceId },
          );
          return { id, subject, object: project };
        }),
    });
  }),
);
