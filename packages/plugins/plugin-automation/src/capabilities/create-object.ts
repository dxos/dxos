//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateAutomationPanel } from '#components';
import { Automation, AutomationOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Automation.Automation),
      customPanel: CreateAutomationPanel,
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Operation.invoke(AutomationOperation.CreateAutomation, { db: options.db, templateId, name }),
    });
  }),
);
