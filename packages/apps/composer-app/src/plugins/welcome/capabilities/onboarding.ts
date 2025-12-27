//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { OnboardingManager } from '../onboarding-manager';

import { WelcomeCapabilities } from './capabilities';

export default async (context: PluginContext) => {
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const client = context.getCapability(ClientCapabilities.Client);
  const searchProps = new URLSearchParams(window.location.search);
  const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

  const token = searchProps.get('token') ?? undefined;
  const type = searchProps.get('type');
  const tokenType = !token ? undefined : type === 'login' ? 'login' : 'verify';
  const manager = new OnboardingManager({
    dispatch,
    client,
    hubUrl,
    token,
    tokenType,
    recoverIdentity: searchProps.get('recoverIdentity') === 'true',
    deviceInvitationCode: searchProps.get('deviceInvitationCode') ?? undefined,
    spaceInvitationCode: searchProps.get('spaceInvitationCode') ?? undefined,
  });

  await manager.initialize();

  return contributes(WelcomeCapabilities.Onboarding, manager, () => manager.destroy());
};
