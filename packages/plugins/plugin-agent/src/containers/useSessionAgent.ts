//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import * as Agent from '@dxos/assistant/Agent';
import { Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { URI } from '@dxos/keys';

import { AgentPresence } from '#types';

/** How long the home agent may take to load before the agent here stands in for it. */
const HOME_TIMEOUT = '5 seconds';

/**
 * The agent whose private chat is the viewer's one conversation with it: for an agent invited from another space,
 * its home agent, so opening it from any space continues the same chat; the agent itself when it is home, or when
 * the viewer cannot reach its home space. `undefined` while the home is being looked up.
 */
export const useSessionAgent = (agent: Agent.Agent): Agent.Agent | undefined => {
  const home = AgentPresence.homeOf(agent);
  const db = Obj.getDatabase(agent);
  const [session, setSession] = useState<Agent.Agent | undefined>(home ? undefined : agent);

  useEffect(() => {
    if (!home || !db) {
      setSession(agent);
      return;
    }

    let cancelled = false;
    setSession(undefined);
    void EffectEx.runPromise(
      Effect.tryPromise(() => db.makeRef(URI.make(home)).tryLoad()).pipe(
        Effect.timeoutOption(HOME_TIMEOUT),
        Effect.map((loaded) => Option.getOrUndefined(loaded)),
        Effect.orElseSucceed(() => undefined),
      ),
    ).then((loaded) => {
      if (!cancelled) {
        setSession(Obj.instanceOf(Agent.Agent, loaded) ? loaded : agent);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [agent, db, home]);

  return session;
};
