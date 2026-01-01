//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Project } from '@dxos/types';

import { templates } from '../../templates';
import { ProjectOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: ProjectOperation.Create,
        handler: ({ db, name, template = 'org-research' }) =>
          Effect.gen(function* () {
            if (templates[template]) {
              const project = yield* Effect.promise(() => templates[template](db));
              if (project) {
                return { object: project };
              }
            }

            return { object: Project.make({ name }) };
          }),
      }),
    ]),
  ),
);
