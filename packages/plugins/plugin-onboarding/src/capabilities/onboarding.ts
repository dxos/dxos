//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { OnboardingManager } from '../onboarding-manager';
import { OnboardingCapabilities } from './capabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const searchProps = new URLSearchParams(window.location.search);
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

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

    return Capability.contributes(OnboardingCapabilities.Onboarding, manager, () =>
      Effect.sync(() => manager.destroy()),
    );
  }),
);
