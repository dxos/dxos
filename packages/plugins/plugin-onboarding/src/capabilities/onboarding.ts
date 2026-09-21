//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { log } from '@dxos/log';
import * as Account from '@dxos/plugin-client/Account';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { OnboardingManager } from '../onboarding-manager.ts';
import { OnboardingCapabilities } from './capabilities.ts';

export const Onboarding = Capability.makeModule(
  'Onboarding',
  {
    requires: [
      AppCapabilities.AppGraph,
      Capabilities.OperationInvoker,
      AppCapabilities.Layout,
      ClientCapabilities.Client,
    ],
    provides: [OnboardingCapabilities.Onboarding],
    // The manager reads `client.halo` synchronously at construction, so it needs the forked
    // client initialization to have completed.
    activatesOn: ClientEvents.Initialized,
  },
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;
    const searchProps = new URLSearchParams(window.location.search);
    const hubUrl = Account.getHubUrl(client.config);

    const token = searchProps.get('token') ?? undefined;
    const manager = new OnboardingManager({
      invokePromise,
      client,
      hubUrl,
      token,
      recoverIdentity: searchProps.get('recoverIdentity') === 'true',
      deviceInvitationCode: searchProps.get('deviceInvitationCode') ?? undefined,
      spaceInvitationCode: searchProps.get('spaceInvitationCode') ?? undefined,
      accountInvitationCode: searchProps.get('accountInvitationCode') ?? undefined,
      email: searchProps.get('email') ?? undefined,
    });

    // Don't block the `Startup` activation event on `initialize()`. The manager
    // is contributed synchronously so the framework treats this module as
    // activated immediately; identity creation, agent provisioning, and
    // credential queries continue in the background. Consumers reading
    // `OnboardingCapabilities.Onboarding` get a manager whose state is observable
    // via the `client.halo.identity` / `client.halo.credentials` subscriptions
    // wired up in the constructor.
    void manager.initialize().catch((error) => log.catch(error));

    yield* Effect.addFinalizer(() => Effect.promise(() => manager.destroy().catch((error) => log.catch(error))));
    return Capability.contribute(OnboardingCapabilities.Onboarding, manager);
  }),
);
