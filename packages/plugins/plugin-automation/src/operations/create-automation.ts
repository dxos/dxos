//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';

import { getAutomationsPath } from '../paths';
import { AutomationCapabilities, AutomationOperation } from '../types';

const handler: Operation.WithHandler<typeof AutomationOperation.CreateAutomation> =
  AutomationOperation.CreateAutomation.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db, templateId, name, subject }) {
        const templates = yield* Capability.getAll(AutomationCapabilities.Template);
        const template = templates.find((entry) => entry.id === templateId);
        invariant(template, `Unknown automation template: ${templateId}`);

        const object = yield* template
          .scaffold({ name, subject })
          .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

        return yield* Operation.invoke(SpaceOperation.AddObject, {
          object,
          target: db,
          hidden: true,
          targetNodeId: getAutomationsPath(db.spaceId),
        });
      }),
    ),
  );

export default handler;
