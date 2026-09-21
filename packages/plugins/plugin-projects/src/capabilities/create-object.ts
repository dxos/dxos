//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Repo } from '@dxos/types';

import { CreateProjectPanel } from '#components';
import { ProjectOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

// Browser-only: the entry supplies `CreateProjectPanel`, the React form that picks the project
// template and collects its name.
export const CreateObject = SpaceCapability.createObject(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
      {
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
      },
      {
        id: Type.getTypename(Repo.Repo),
        createObject: (props: Parameters<typeof Repo.make>[0], options: CreateOptions) =>
          Operation.invoke(
            SpaceOperation.AddObject,
            { object: Repo.make(props), target: options.target },
            { spaceId: options.db.spaceId },
          ),
      },
    ]);
  }),
  {
    environments: [],
  },
);
