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
    const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
    const client = context.getCapability(ClientCapabilities.Client);
    const searchParams = new URLSearchParams(window.location.search);
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

    const token = searchParams.get('token') ?? undefined;
    const type = searchParams.get('type');
    const tokenType = !token ? undefined : type === 'login' ? 'login' : 'verify';
    const manager = new OnboardingManager({
      dispatch,
      client,
      hubUrl,
      token,
      tokenType,
      recoverIdentity: searchParams.get('recoverIdentity') === 'true',
      deviceInvitationCode: searchParams.get('deviceInvitationCode') ?? undefined,
      spaceInvitationCode: searchParams.get('spaceInvitationCode') ?? undefined,
    });

    yield* Effect.tryPromise(() => manager.initialize());

    return Capability.contributes(WelcomeCapabilities.Onboarding, manager, () => Effect.sync(() => manager.destroy()));
  }),
);
