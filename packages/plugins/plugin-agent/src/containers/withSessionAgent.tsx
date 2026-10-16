//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import type * as Agent from '@dxos/assistant/Agent';

import { useSessionAgent } from './useSessionAgent.ts';

/**
 * Renders an agent's companion for the agent its article talks to (`useSessionAgent`), so an agent invited from
 * another space shows its home's knowledge and activity, as its article shows its home's conversation.
 */
export const withSessionAgent = <P extends { agent: Agent.Agent }>(Component: ComponentType<P>) => {
  const WithSessionAgent = (props: P) => {
    const session = useSessionAgent(props.agent);
    return session ? <Component {...props} agent={session} /> : null;
  };
  WithSessionAgent.displayName = `withSessionAgent(${Component.displayName ?? Component.name})`;
  return WithSessionAgent;
};
