//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Context } from '@dxos/context';
import { type AgentHalo } from '@dxos/edge-client';
import { IdentityDid, type PublicKey } from '@dxos/keys';
import { buf, toPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ControlledSelector, CredentialsTable, JsonView } from '../../../../components/index.ts';
import { type ArticleProps } from '../../types.ts';

const VIEWS = ['identity', 'credentials'] as const;
type View = (typeof VIEWS)[number];

type Agent = { spaceId: string; name?: string; did: IdentityDid };

/**
 * An agent's HALO, which no client replicates, read from EDGE (`GET /compute/brain/:did/halo`): pick one of the agents
 * the viewer administers to see its identity, admins and spaces, or every credential in its HALO. EDGE answers the
 * agent's admins only, and its refusal shows as `error`.
 */
export const AgentsArticle = ({ role }: ArticleProps) => {
  const client = useClient();
  const agents = useAgents();
  const [selected, setSelected] = useState<string>();
  const [view, setView] = useState<View>('identity');
  const [halo, setHalo] = useState<AgentHalo>();
  const [error, setError] = useState<string>();

  const labels = useMemo(
    () => new Map(agents.map((agent) => [`${agent.name ?? 'Unnamed'} (${agent.did})`, agent])),
    [agents],
  );
  const agent = selected ? labels.get(selected) : undefined;

  useEffect(() => {
    setHalo(undefined);
    setError(undefined);
    if (!agent) {
      return;
    }
    let current = true;
    // `client.edge` throws when EDGE is not configured, which shows as `error` rather than failing the page.
    Promise.resolve()
      .then(() => client.edge.http.getAgentHalo(Context.default(), agent.did))
      .then(
        (result) => current && setHalo(result),
        (err) => current && setError(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      current = false;
    };
  }, [client, agent?.did]);

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

/** The agent owns its default space, in which its admins are the members who may write. */
const agentOf = (space: Space, viewer: PublicKey): Agent | undefined => {
  const members = space.members.get();
  const owner = members.find((member) => member.role === SpaceMember_Role.OWNER)?.identity;
  const administers = members.some(
    (member) =>
      (toPublicKey(member.identity?.identityKey)?.equals(viewer) ?? false) &&
      (member.role === SpaceMember_Role.ADMIN || member.role === SpaceMember_Role.EDITOR),
  );
  return administers && IdentityDid.isValid(owner?.did)
    ? { spaceId: space.id, name: space.isOpen ? space.properties?.name : undefined, did: owner.did }
    : undefined;
};

/** The agents the viewer administers, re-read whenever the client's spaces or their members change. */
const useAgents = (): Agent[] => {
  const client = useClient();
  const viewer = toPublicKey(useIdentity()?.identityKey);
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
    return () => {
      spaces.unsubscribe();
      members.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client]);

  return useMemo(
    () =>
      viewer
        ? client.spaces
            .get()
            .filter((space) => space.tags.includes(AppSpace.AGENT_SPACE_TAG))
            .flatMap((space) => agentOf(space, viewer) ?? [])
        : [],
    [client, viewer?.toHex(), revision],
  );
};
