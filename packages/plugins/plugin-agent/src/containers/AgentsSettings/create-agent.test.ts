//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { type Context } from '@dxos/context';
import { Database, Feed } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { TestHelpers } from '@dxos/effect/testing';
import { IdentityDid, PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Text } from '@dxos/schema';

import { AgentOperationHandlerSet } from '#operations';
import { AgentCapabilities, type AgentSettings, Mode } from '#types';

import { createAgent } from './create-agent.ts';

/** EDGE answering every provisioning request with a fresh identity, recording the routes it is asked for. */
class TestEdge extends EdgeHttpClient {
  readonly paths: string[] = [];

  override async request(_ctx: Context, path: string): Promise<unknown> {
    this.paths.push(path);
    return { identity: { identityDid: IdentityDid.random(), identityKey: PublicKey.random().toHex() }, membership: '' };
  }
}

// One manager for the file: the test layer resolves `Capability.Service` before a test body runs, so the test varies
// the setting the manager holds rather than the manager itself.
const edge = new TestEdge('http://edge.test');
const registry = AtomRegistry.make();
const settingsAtom = Atom.make<AgentSettings.Settings>({}).pipe(Atom.keepAlive);
const manager = CapabilityManager.make({ registry });
manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
manager.contribute({ module: 'test', interface: AgentCapabilities.Settings, implementation: settingsAtom });
manager.contribute({ module: 'test', interface: ClientCapabilities.EdgeHttpClient, implementation: edge });

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Agent.Agent, Session.Session, Skill.Skill, Feed.Feed, Text.Text, Instructions.Instructions, Mode.Mode],
  extraServices: Layer.succeed(Capability.Service, manager),
});

describe('createAgent', () => {
  it.effect(
    'gives a new agent an identity only while the setting asks for one, and otherwise asks EDGE nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        // Off, as it is by default: the agent is created as agents always were, its brain named by its id.
        const ada = yield* createAgent(db, { name: 'Ada' });
        expect(ada.did).toBeUndefined();
        expect(edge.paths).toEqual([]);

        registry.set(settingsAtom, { identities: true });
        const kai = yield* createAgent(db, { name: 'Kai' });
        expect(kai.did).toMatch(/^did:halo:/);
        expect(edge.paths).toEqual(['/compute/brain']);
      },
      Effect.provide(TestLayer),
      Effect.provideService(Capability.Service, manager),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
