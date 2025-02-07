//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientAction } from '@dxos/plugin-client/types';
import { DeviceType } from '@dxos/react-client/halo';

import { WelcomeCapabilities } from './capabilities';
import { queryAllCredentials } from '../../../util';
import { OnboardingManager } from '../onboarding-manager';

export default async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const pluginManager = context.requestCapability(Capabilities.PluginManager);
  const client = context.requestCapability(ClientCapabilities.Client);
  const searchParams = new URLSearchParams(window.location.search);
  const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

  const manager = new OnboardingManager({
    dispatch,
    client,
    context: pluginManager.context,
    hubUrl,
    token: searchParams.get('token') ?? undefined,
    recoverIdentity: searchParams.get('recoverIdentity') === 'true',
    deviceInvitationCode: searchParams.get('deviceInvitationCode') ?? undefined,
    spaceInvitationCode: searchParams.get('spaceInvitationCode') ?? undefined,
  });

  await manager.initialize();

  // TODO(wittjosiah): Fold into onboarding manager.
  const identity = client.halo.identity.get();
  const credentials = await queryAllCredentials(client);
  const recoveryCredential = credentials.find(
    (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
  );
  if (identity && !recoveryCredential) {
    await dispatch(createIntent(ClientAction.CreateRecoveryCode));
  }

  const devices = client.halo.devices.get();
  const edgeAgent = devices.find(
    (device) => device.profile?.type === DeviceType.AGENT_MANAGED && device.profile?.os?.toUpperCase() === 'EDGE',
  );
  if (identity && !edgeAgent) {
    await dispatch(createIntent(ClientAction.CreateAgent));
  }

  return contributes(WelcomeCapabilities.Onboarding, manager, () => manager.destroy());
};
