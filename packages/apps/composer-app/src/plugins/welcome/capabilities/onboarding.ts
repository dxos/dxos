//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { WelcomeCapabilities } from './capabilities';
import { OnboardingManager } from '../onboarding-manager';

export default async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const client = context.requestCapability(ClientCapabilities.Client);
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

  await manager.initialize();

  return contributes(WelcomeCapabilities.Onboarding, manager, () => manager.destroy());
};
