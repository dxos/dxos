//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Context } from '@dxos/context';
import { ControlledSelector, CredentialsTable, JsonView } from '@dxos/devtools';
import { type AgentHalo } from '@dxos/edge-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { buf, toPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { AgentSpace } from '#types';

const VIEWS = ['identity', 'credentials'] as const;
type View = (typeof VIEWS)[number];

export type AgentsDebugProps = {
  role?: string;
};

/**
 * The debug panel's page for the agents the identity administers: pick one to read from EDGE its identity, admins, the
 * spaces it is in, and every credential in its HALO, which no client replicates.
 */
export const AgentsDebug = ({ role }: AgentsDebugProps) => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const edge = Hooks.useOptionalCapability(ClientCapabilities.EdgeHttpClient);
  const agents = useAdministeredAgents();
  const [selected, setSelected] = useState<string>();
  const [view, setView] = useState<View>('identity');
  const [halo, setHalo] = useState<AgentHalo>();
  const [error, setError] = useState<string>();

  const labels = useMemo(
    () => new Map(agents.flatMap((agent) => (agent.did ? [[`${agent.name ?? 'Unnamed'} (${agent.did})`, agent]] : []))),
    [agents],
  );
  const agent = selected ? labels.get(selected) : undefined;

  useEffect(() => {
    setHalo(undefined);
    setError(undefined);
    if (!edge || !agent?.did) {
      return;
    }
    let current = true;
    edge.getAgentHalo(Context.default(), agent.did).then(
      (result) => current && setHalo(result),
      (err) => current && setError(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      current = false;
    };
  }, [edge, agent?.did]);

  const credentials = useMemo(
    () =>
      halo?.credentials.map((credential) =>
        buf.fromBinary(
          CredentialSchema,
          Uint8Array.from(atob(credential), (char) => char.charCodeAt(0)),
        ),
      ) ?? [],
    [halo],
  );

  const identity = useMemo(() => {
    if (!agent) {
      return { agents: agents.length };
    }
    const spaceName = (spaceId: string) => {
      const space = client.spaces.get().find((candidate) => candidate.id === spaceId);
      return { spaceId, name: space?.isOpen ? space.properties?.name : undefined, joined: space !== undefined };
    };
    return {
      agent,
      ...(error ? { error } : {}),
      ...(halo
        ? {
            identity: halo.identity,
            haloSpaceId: halo.haloSpaceId,
            adminKeys: halo.adminKeys,
            joinedSpaces: halo.joinedSpaceIds.map(spaceName),
            memberSpaces: halo.memberSpaceIds.map(spaceName),
            credentials: credentials.length,
          }
        : {}),
    };
  }, [client, agents, agent, halo, error, credentials]);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <ControlledSelector
            values={[...labels.keys()]}
            value={selected ?? ''}
            setValue={setSelected}
            placeholder='Select agent'
          />
          <ControlledSelector values={[...VIEWS]} value={view} setValue={setView} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {/* Keyed by the agent, so a credential picked for one agent is not shown as another's. */}
        {view === 'credentials' && !error ? (
          <CredentialsTable key={agent?.did} credentials={credentials} />
        ) : (
          <JsonView data={identity} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

/** The agents the identity administers, re-read whenever the client's spaces, its identity or a space's members change. */
const useAdministeredAgents = (): AgentSpace.Summary[] => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    const members = new Map<string, { unsubscribe: () => void }>();
    const spaces = client.spaces.subscribe((all) => {
      // A space that left and came back is subscribed to afresh, not through its stale entry.
      for (const [spaceId, subscription] of members) {
        if (!all.some((space) => space.id === spaceId)) {
          subscription.unsubscribe();
          members.delete(spaceId);
        }
      }
      for (const space of all) {
        if (!members.has(space.id)) {
          members.set(space.id, space.members.subscribe(changed));
        }
      }
      changed();
    });
    const identity = client.halo.identity.subscribe(changed);
    return () => {
      spaces.unsubscribe();
      identity.unsubscribe();
      members.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client]);

  return useMemo(() => {
    const viewer = toPublicKey(client.halo.identity.get()?.identityKey);
    return viewer ? AgentSpace.administeredAgents(client.spaces.get(), viewer) : [];
  }, [client, revision]);
};
