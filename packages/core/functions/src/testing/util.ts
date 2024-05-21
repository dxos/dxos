//
// Copyright 2024 DXOS.org
//

import { Filter, type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { FunctionTrigger, FunctionTriggerType } from '../types';

export const triggerWebhook = async (space: Space, uri: string) => {
  const trigger = (
    await space.db.query(Filter.schema(FunctionTrigger, (t: FunctionTrigger) => t.function === uri)).run()
  ).objects[0];
  invariant(trigger.spec.type === FunctionTriggerType.WEBHOOK);
  void fetch(`http://localhost:${trigger.spec.port}`);
};
