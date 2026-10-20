//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Atom from 'effect/reactivity/Atom';
import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import type * as AgentService from '@dxos/compute/AgentService';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { raise } from '@dxos/debug';
import { Database, Filter, Obj } from '@dxos/echo';
import { type Grant, Principal } from '@dxos/permission';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';

import { type LocationKind } from '../components/index.ts';
import {
  AGENT_MODEL,
  PERMISSION_DEMO_SKILL_KEY,
  type PermissionId,
  makeAgentLayer,
  makeGuard,
} from '../testing/index.ts';

/** What the configurator spawns: a prompt, the permissions to grant, and where the agent runs. */
export type AgentConfig = {
  prompt: string;
  permissions: readonly PermissionId[];
  location: LocationKind;
};

/** A spawned agent: its configuration, the grant its guard holds, and its session once it exists. */
export type PermissionAgent = {
  id: string;
  /** 1-based, for the card title. */
  index: number;
  config: AgentConfig;
  location: Process.Location;
  /** The principal the grant names as its audience and the guard checks as. */
  principal: Principal.Principal;
  grant?: Grant.Grant;
  session?: AgentService.Session;
  error?: string;
};

export type PermissionContextValue = {
  /** Whether agents can be spawned on EDGE as well as locally. */
  edge: boolean;
  /** False until the runtime, the space and the identity exist. */
  ready: boolean;
  agents: PermissionAgent[];
  /** Every process of the runtime, local and EDGE, for the process tree. */
  processTreeAtom?: Atom.Atom<readonly Process.Process[]>;
  spawn: (config: AgentConfig) => void;
  remove: (id: string) => void;
};

const Context = createContext<PermissionContextValue | undefined>(undefined);

export const usePermissionAgents = (): PermissionContextValue =>
  useContext(Context) ?? raise(new Error('Missing PermissionProvider'));

type Runtime = ManagedRuntime.ManagedRuntime<Layer.Success<ReturnType<typeof makeAgentLayer>>, never>;

export type PermissionProviderProps = PropsWithChildren<{ edge?: boolean }>;

/**
 * Shares one agent runtime between the story's modules. Each spawn grants the new agent's process
 * exactly the checked permissions, from the story's identity, through the guard it is spawned with.
 */
export const PermissionProvider = ({ edge = false, children }: PermissionProviderProps) => {
  const client = useClient();
  const [space] = useSpaces();
  const registry = useContext(RegistryContext);
  const [agents, setAgents] = useState<PermissionAgent[]>([]);
  const [processTreeAtom, setProcessTreeAtom] = useState<Atom.Atom<readonly Process.Process[]>>();
  const counter = useRef(0);
  const did = client.halo.identity.get()?.did;

  // Created in the effect so a StrictMode remount builds a fresh runtime rather than reusing a disposed one.
  const [runtime, setRuntime] = useState<Runtime>();
  useEffect(() => {
    if (!space) {
      return;
    }
    const next = ManagedRuntime.make(makeAgentLayer({ registry, client, db: space.db, edge }));
    setRuntime(next);
    void next
      .runPromise(
        Effect.gen(function* () {
          return yield* Process.ManagerService;
        }),
      )
      .then((manager) => setProcessTreeAtom(() => manager.processTreeAtom));
    return () => {
      setAgents([]);
      setProcessTreeAtom(undefined);
      void next.dispose();
    };
  }, [registry, client, space, edge]);

  const update = useCallback(
    (id: string, patch: Partial<PermissionAgent>) =>
      setAgents((prev) => prev.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent))),
    [],
  );

  const spawn = useCallback(
    (config: AgentConfig) => {
      if (!runtime || !space || !did) {
        return;
      }
      const index = ++counter.current;
      const id = `agent-${index}`;
      const location: Process.Location =
        config.location === 'edge' ? { kind: 'edge', space: space.id } : { kind: 'local' };
      const principal = Principal.process(`process://${config.location}/story/agent-${index}`);
      setAgents((prev) => [{ id, index, config, location, principal }, ...prev]);
      void runtime
        .runPromiseExit(
          Effect.gen(function* () {
            const { grant, guard } = yield* makeGuard({
              issuer: did,
              audience: principal,
              permissions: config.permissions,
            });
            update(id, { grant });
            const skill = yield* findSkill;
            const session = yield* AgentServiceRuntime.createSession({
              skills: [skill],
              model: AGENT_MODEL,
              location: config.location,
              guard,
            });
            update(id, { session });
            yield* session.submitPrompt(config.prompt);
          }),
        )
        .then((exit) => {
          if (Exit.isFailure(exit)) {
            update(id, { error: Cause.pretty(exit.cause) });
          }
        });
    },
    [runtime, space, did, update],
  );

  const remove = useCallback((id: string) => setAgents((prev) => prev.filter((agent) => agent.id !== id)), []);

  const value = useMemo<PermissionContextValue>(
    () => ({ edge, ready: !!runtime && !!space && !!did, agents, processTreeAtom, spawn, remove }),
    [edge, runtime, space, did, agents, processTreeAtom, spawn, remove],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/** The space's copy of the demo skill, seeded by the story so EDGE replicates it with the chat. */
const findSkill = Effect.gen(function* () {
  const skills = yield* Database.query(Filter.type(Skill.Skill)).run;
  const skill = skills.find((candidate) => Obj.getMeta(candidate).key === PERMISSION_DEMO_SKILL_KEY);
  return skill ?? (yield* Effect.die(new Error('The story space has no permission demo skill.')));
});
