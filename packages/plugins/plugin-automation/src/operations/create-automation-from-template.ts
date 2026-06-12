//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AutomationCapabilities, AutomationOperation } from '../types';

const handler: Operation.WithHandler<typeof AutomationOperation.CreateAutomationFromTemplate> =
  AutomationOperation.CreateAutomationFromTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db, templateId, name, subject }) {
        const templates = yield* Capability.getAll(AutomationCapabilities.Template);
        const template = templates.find((entry) => entry.id === templateId);
        invariant(template, `Unknown automation template: ${templateId}`);

        // Auxiliary objects the template creates (triggers, runnable) are added via Database.Service; the
        // returned Automation is added to the space tree by the caller's SpaceOperation.AddObject.
        const object = yield* template
          .scaffold({ name, subject })
          .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

        return { object };
      }),
    ),
  );

export default handler;
