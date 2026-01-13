//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { OnboardingManager } from '../onboarding-manager';

import { WelcomeCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
    const client = context.getCapability(ClientCapabilities.Client);
    const searchProps = new URLSearchParams(window.location.search);
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

    const token = searchProps.get('token') ?? undefined;
    const type = searchProps.get('type');
    const tokenType = !token ? undefined : type === 'login' ? 'login' : 'verify';
    const manager = new OnboardingManager({
      invokePromise,
      client,
      hubUrl,
      token,
      tokenType,
      recoverIdentity: searchProps.get('recoverIdentity') === 'true',
      deviceInvitationCode: searchProps.get('deviceInvitationCode') ?? undefined,
      spaceInvitationCode: searchProps.get('spaceInvitationCode') ?? undefined,
    });

    yield* Effect.tryPromise(() => manager.initialize());

    return Capability.contributes(WelcomeCapabilities.Onboarding, manager, () => Effect.sync(() => manager.destroy()));
  }),
);
