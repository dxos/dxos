//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { type Context } from '@dxos/context';
import { Database, Feed, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { TestHelpers } from '@dxos/effect/testing';
import { IdentityDid, PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Text } from '@dxos/schema';

import { AgentOperationHandlerSet } from '#operations';
import { AgentOperation, Mode } from '#types';

/** EDGE answering every provisioning request with a fresh identity, recording the routes it is asked for. */
class TestEdge extends EdgeHttpClient {
  readonly paths: string[] = [];

  override async request(_ctx: Context, path: string): Promise<unknown> {
    this.paths.push(path);
    return { identity: { identityDid: IdentityDid.random(), identityKey: PublicKey.random().toHex() }, membership: '' };
  }
}

const edge = new TestEdge('http://edge.test');
const manager = CapabilityManager.make({ registry: AtomRegistry.make() });
manager.contribute({ module: 'test', interface: ClientCapabilities.EdgeHttpClient, implementation: edge });

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Agent.Agent, Session.Session, Skill.Skill, Feed.Feed, Text.Text, Instructions.Instructions, Mode.Mode],
  extraServices: Layer.succeed(Capability.Service, manager),
});

describe('EnsureIdentity', () => {
  it.effect(
    'provisions an agent without a DID only when asked to mint, since the DID renames its brain',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Ada' }, { spaceId: db.spaceId });
        const ada = yield* Effect.promise(() => db.makeRef<Agent.Agent>(agent.uri).load());

        // An agent that may have talked keeps the brain named by its id.
        const repaired = yield* Operation.invoke(
          AgentOperation.EnsureIdentity,
          { agent: Ref.make(ada) },
          { spaceId: db.spaceId },
        );
        expect(repaired).toEqual({ provisioned: false });
        expect(ada.did).toBeUndefined();
        expect(edge.paths).toEqual([]);

        const minted = yield* Operation.invoke(
          AgentOperation.EnsureIdentity,
          { agent: Ref.make(ada), mint: true },
          { spaceId: db.spaceId },
        );
        expect(minted.provisioned).toBe(true);
        expect(ada.did).toBe(minted.identityDid);
        expect(edge.paths).toEqual(['/compute/brain']);
      },
      Effect.provide(TestLayer),
      Effect.provideService(Capability.Service, manager),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
