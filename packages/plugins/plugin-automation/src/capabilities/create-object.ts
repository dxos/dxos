//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { CreateAutomationPanel } from '#components';
import { Automation, AutomationOperation } from '#types';

import { getAutomationsPath } from '../paths';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Automation.Automation),
      customPanel: CreateAutomationPanel,
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Effect.gen(function* () {
          // Scaffold via the shared op so the create dialog and the companion dropdown follow one path.
          const { object } = yield* Operation.invoke(AutomationOperation.CreateAutomationFromTemplate, {
            db: options.db,
            templateId,
            name,
          });

          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            // Automations are not first-class items in the space tree; keep them out of the root collection.
            hidden: true,
            // Land new automations under the dedicated "Automations" section (typeSection idiom).
            targetNodeId: options.targetNodeId ?? getAutomationsPath(options.db.spaceId),
          });
        }),
    });
  }),
);
