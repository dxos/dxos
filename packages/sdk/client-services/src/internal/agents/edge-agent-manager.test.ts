//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { type CreateAgentRequestBody, type CreateAgentResponseBody, EdgeAgentStatus } from '@dxos/protocols';
import { requirePublicKey } from '@dxos/protocols/buf';
import { Runtime_Client_EdgeFeaturesSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ComplexMap } from '@dxos/util';

import type * as SpacesContract from '../../contracts/spaces.ts';
import { type AgentOwner, EdgeAgentManager } from './edge-agent-manager.ts';

const AGENTS_ENABLED = create(Runtime_Client_EdgeFeaturesSchema, { agents: true });

describe('EdgeAgentManager', () => {
  test('admits the agent EDGE created into the identity that asked for it', async ({ expect }) => {
    const owner = new TestOwner();
    const edge = new TestEdge();
    const manager = new EdgeAgentManager(AGENTS_ENABLED, edge, new TestSpaces(), () => owner);
    await manager.open(new Context());

    const agentKey = PublicKey.random();
    const creating = manager.createAgent(new Context());
    await edge.requested.wait();
    edge.created.wake({ deviceKey: agentKey.toHex(), feedKey: PublicKey.random().toHex() });
    await creating;

    expect(owner.admitted).toEqual([agentKey]);
    expect(manager.agentStatus).toEqual(EdgeAgentStatus.ACTIVE);
    await manager.close();
  });

  // A device-invitation guest boots with a throwaway identity, starts provisioning its agent, and is
  // joined to the host's identity in place before EDGE answers. The answer is the throwaway
  // identity's agent; admitted into the host's HALO it carried an AuthorizedDevice its owner never
  // issued, which EDGE refused on every replay of that HALO (QA-7 in `halo.spec.ts`).
  test('does not admit an agent into an identity that replaced its owner mid-request', async ({ expect }) => {
    const guest = new TestOwner();
    const host = new TestOwner();
    let active = guest;
    const edge = new TestEdge();
    const manager = new EdgeAgentManager(AGENTS_ENABLED, edge, new TestSpaces(), () => active);
    await manager.open(new Context());

    const creating = manager.createAgent(new Context());
    const request = await edge.requested.wait();
    expect(request.identityDid).toEqual(guest.did);

    active = host;
    edge.created.wake({ deviceKey: PublicKey.random().toHex(), feedKey: PublicKey.random().toHex() });
    await creating;

    expect(host.admitted).toEqual([]);
    expect(guest.admitted).toEqual([]);
    await manager.close();
  });

  test('does not report the agent of an identity replaced during its admission as active', async ({ expect }) => {
    const guest = new TestOwner();
    const host = new TestOwner();
    let active = guest;
    guest.duringAdmission = () => {
      active = host;
    };
    const edge = new TestEdge();
    const manager = new EdgeAgentManager(AGENTS_ENABLED, edge, new TestSpaces(), () => active);
    await manager.open(new Context());

    const agentKey = PublicKey.random();
    const creating = manager.createAgent(new Context());
    await edge.requested.wait();
    edge.created.wake({ deviceKey: agentKey.toHex(), feedKey: PublicKey.random().toHex() });
    await creating;

    expect(guest.admitted).toEqual([agentKey]);
    expect(manager.agentStatus).not.toEqual(EdgeAgentStatus.ACTIVE);
    await manager.close();
  });
});

/** An identity that records the devices it admits instead of writing credentials. */
class TestOwner implements AgentOwner {
  readonly identityKey = PublicKey.random();
  readonly did = IdentityDid.random();
  readonly haloSpaceId = SpaceId.random();
  readonly haloSpaceKey = PublicKey.random();
  readonly authorizedDeviceKeys: AgentOwner['authorizedDeviceKeys'] = new ComplexMap(PublicKey.hash);
  readonly stateUpdate = new Event();
  readonly admitted: PublicKey[] = [];
  duringAdmission?: () => void;

  readonly admitDevice: AgentOwner['admitDevice'] = async (request) => {
    this.duringAdmission?.();
    this.admitted.push(requirePublicKey(request.deviceKey));
    return create(CredentialSchema, {});
  };
}

/** EDGE whose agent creation answers only when the test wakes `created`. */
class TestEdge implements Pick<EdgeHttpClient, 'createAgent' | 'getAgentStatus'> {
  readonly requested = new Trigger<CreateAgentRequestBody>();
  readonly created = new Trigger<CreateAgentResponseBody>();

  readonly createAgent: EdgeHttpClient['createAgent'] = async (_ctx, body) => {
    this.requested.wake(body);
    return this.created.wait();
  };

  readonly getAgentStatus: EdgeHttpClient['getAgentStatus'] = async () => ({
    agent: { status: EdgeAgentStatus.NOT_FOUND },
  });
}

class TestSpaces implements Pick<SpacesContract.Manager, 'spaces' | 'updated'> {
  readonly spaces: SpacesContract.Manager['spaces'] = new ComplexMap(PublicKey.hash);
  readonly updated = new Event();
}
