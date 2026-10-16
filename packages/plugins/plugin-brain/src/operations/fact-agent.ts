//
// Copyright 2026 DXOS.org
//

import * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj } from '@dxos/echo';

/**
 * The agent whose brain receives the facts read from an object: the space's only agent. Undefined when the space has
 * none or several, since filling the wrong agent's brain is worse than filling none.
 */
export const factAgent = (object: Obj.Unknown): Agent.Agent | undefined => {
  const agents = Obj.getDatabase(object)?.query(Filter.type(Agent.Agent)).runSync() ?? [];
  return agents.length === 1 ? agents[0] : undefined;
};
