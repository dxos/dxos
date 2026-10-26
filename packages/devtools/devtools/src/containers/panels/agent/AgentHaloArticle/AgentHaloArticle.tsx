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
import { type Space, type SpaceMember, useMembers, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ControlledSelector, CredentialsTable, JsonView } from '../../../../components/index.ts';
import { type ArticleProps } from '../../types.ts';

const VIEWS = ['identity', 'credentials'] as const;
type View = (typeof VIEWS)[number];

/**
 * An agent's HALO, which no client replicates, read from EDGE (`GET /compute/brain/:did/halo`): pick one of the agents
 * the viewer administers to see its identity, admins and spaces, or every credential in its HALO. EDGE answers the
 * agent's admins only, and its refusal shows as `error`.
 */
export const AgentHaloArticle = ({ role }: ArticleProps) => {
  const client = useClient();
  const viewer = toPublicKey(useIdentity()?.identityKey);
  const spaces = useSpaces({ all: true });
  const agentSpaces = spaces.filter((space) => space.tags.includes(AppSpace.AGENT_SPACE_TAG));
  const [spaceId, setSpaceId] = useState<string>();
  const [view, setView] = useState<View>('identity');
  const [halo, setHalo] = useState<AgentHalo>();
  const [error, setError] = useState<string>();

  const members = useMembers(spaceId);
  const did = viewer ? administeredAgent(members, viewer) : undefined;

  useEffect(() => {
    setHalo(undefined);
    setError(undefined);
    if (!did) {
      return;
    }
    let current = true;
    // `client.edge` throws when EDGE is not configured, which shows as `error` rather than failing the page.
    Promise.resolve()
      .then(() => client.edge.http.getAgentHalo(Context.default(), did))
      .then(
        (result) => current && setHalo(result),
        (err) => current && setError(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      current = false;
    };
  }, [client, did]);

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

  const spaceName = (id: string) => {
    const space = spaces.find((candidate) => candidate.id === id);
    return { spaceId: id, name: space && nameOf(space), joined: space !== undefined };
  };
  const identity = did
    ? {
        agent: { ...spaceName(spaceId ?? ''), did },
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
      }
    : { agentSpaces: agentSpaces.length };

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          {viewer && <AgentSelector spaces={agentSpaces} viewer={viewer} value={spaceId} onChange={setSpaceId} />}
          <ControlledSelector values={[...VIEWS]} value={view} setValue={setView} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {/* Keyed by the agent, so a credential picked for one agent is not shown as another's. */}
        {view === 'credentials' && !error ? (
          <CredentialsTable key={did} credentials={credentials} />
        ) : (
          <JsonView data={identity} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

type AgentSelectorProps = {
  spaces: Space[];
  viewer: PublicKey;
  value?: string;
  onChange: (spaceId: string) => void;
};

/** Picks an agent by its default space, offering only the agents the viewer administers. */
const AgentSelector = ({ spaces, viewer, value, onChange }: AgentSelectorProps) => {
  const items = spaces.map((space) => ({ value: space.id, label: nameOf(space) ?? space.id }));
  return (
    <Select.Root
      items={items}
      value={value ? [value] : []}
      onValueChange={({ value: [next] }) => next && onChange(next)}
    >
      <Select.Trigger placeholder='Select agent' />
      <Select.Content>
        {items.map((item) => (
          <AgentItem key={item.value} item={item} viewer={viewer} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};

/** One agent space's option, read from its members so it shows only while the viewer administers that agent. */
const AgentItem = ({ item, viewer }: { item: { value: string; label: string }; viewer: PublicKey }) => {
  const did = administeredAgent(useMembers(item.value), viewer);
  return did ? (
    <Select.Item item={item}>
      {item.label} ({did})
    </Select.Item>
  ) : null;
};

/** The agent owns its default space, in which its admins are the members who may write. */
const administeredAgent = (members: SpaceMember[], viewer: PublicKey): IdentityDid | undefined => {
  const administers = members.some(
    (member) =>
      (toPublicKey(member.identity?.identityKey)?.equals(viewer) ?? false) &&
      (member.role === SpaceMember_Role.ADMIN || member.role === SpaceMember_Role.EDITOR),
  );
  const owner = members.find((member) => member.role === SpaceMember_Role.OWNER)?.identity?.did;
  return administers && IdentityDid.isValid(owner) ? owner : undefined;
};

const nameOf = (space: Space): string | undefined => (space.isOpen ? space.properties?.name : undefined);
