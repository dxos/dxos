//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';

import { chain, createIntent, LayoutAction, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { SubscriptionList, type Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Account, ClientAction } from '@dxos/plugin-client/types';
import { HelpAction } from '@dxos/plugin-help/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Client } from '@dxos/react-client';
import { DeviceType, type Credential, type Identity } from '@dxos/react-client/halo';

import { WELCOME_SCREEN } from './components';
import { activateAccount, getProfile, matchServiceCredential, upgradeCredential } from './credentials';
import { WELCOME_PLUGIN } from './meta';
import { queryAllCredentials, removeQueryParamByValue } from '../../util';

export type OnboardingManagerParams = {
  dispatch: PromiseIntentDispatcher;
  client: Client;
  firstRun?: Trigger;
  hubUrl?: string;
  token?: string;
  tokenType?: 'login' | 'verify';
  recoverIdentity?: boolean;
  deviceInvitationCode?: string;
  spaceInvitationCode?: string;
};

export class OnboardingManager {
  private readonly _ctx = new Context();
  private readonly _subscriptions = new SubscriptionList();
  private readonly _dispatch: PromiseIntentDispatcher;
  private readonly _client: Client;
  private readonly _hubUrl?: string;
  private readonly _skipAuth: boolean;
  private readonly _token?: string;
  private readonly _tokenType?: 'login' | 'verify';
  private readonly _recoverIdentity?: boolean;
  private readonly _deviceInvitationCode?: string;
  private readonly _spaceInvitationCode?: string;

  private _identity: Identity | null = null;
  private _credential: Credential | null = null;

  constructor({
    dispatch,
    client,
    hubUrl,
    token,
    tokenType,
    recoverIdentity,
    deviceInvitationCode,
    spaceInvitationCode,
  }: OnboardingManagerParams) {
    this._ctx.onDispose(() => this._subscriptions.clear());

    this._dispatch = dispatch;
    this._client = client;
    this._hubUrl = hubUrl;
    this._skipAuth = ['main', 'labs'].includes(client.config.values.runtime?.app?.env?.DX_ENVIRONMENT) || !this._hubUrl;
    this._token = token;
    this._tokenType = tokenType;
    this._recoverIdentity = recoverIdentity || false;
    this._deviceInvitationCode = deviceInvitationCode;
    this._spaceInvitationCode = spaceInvitationCode;

    this._subscriptions.add(
      this._client.halo.identity.subscribe((identity) => {
        this._identity = identity;

        // If joining an existing identity, optimistically assume that credential will be found and close welcome.
        if (this._deviceInvitationCode !== undefined || this._recoverIdentity) {
          void this._closeWelcome();
        }
      }).unsubscribe,
    );

    this._subscriptions.add(
      this._client.halo.credentials.subscribe((credentials) => {
        this._setCredential(credentials);
      }).unsubscribe,
    );
  }

  async initialize() {
    await this._fetchBetaCredential();
    if (this._credential && this._hubUrl) {
      // Don't block app loading on network request.
      void this._upgradeCredential();
      // Automatically start join space flow if already authed.
      this._spaceInvitationCode && (await this._openJoinSpace());
      // Ensure that recovery credential is present.
      await this._setupRecovery();
      // Ensure that agent is present.
      await this._createAgent();
      return;
    } else if (!this._skipAuth) {
      // Show welcome screen if no credential found and not skipping auth.
      await this._showWelcome();
    }

    if (this._deviceInvitationCode !== undefined) {
      // If device invitation code is present, open join identity flow.
      await this._openJoinIdentity();
    } else if (this._recoverIdentity) {
      // If recovery flag is present, open recover identity flow.
      await this._openRecoverIdentity();
    } else if (!this._identity && (this._token || this._skipAuth) && this._tokenType === 'verify') {
      // If there's no existing identity and a verification token (or if skipping auth), setup a new identity.
      await this._createIdentity();
      await this._setupRecovery();
      await this._startHelp();
      await this._createAgent();
      await this._activateAccount();
    } else if (!this._identity && this._token && this._tokenType === 'login') {
      // If there's no existing identity and a login token, recover the identity.
      await this._login();
    } else if (this._identity && this._token) {
      // If there's an existing identity and a verification token, activate the account.
      await this._activateAccount();
    }

    if (this._skipAuth && this._spaceInvitationCode) {
      // If skipping auth and a space invitation code is present, open join space flow.
      await this._openJoinSpace();
    }
  }

  async destroy() {
    await this._ctx.dispose();
  }

  private async _queryRecoveryCredentials() {
    const credentials = await queryAllCredentials(this._client);
    return credentials.filter(
      (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
    );
  }

  private async _setupRecovery() {
    const credentials = await this._queryRecoveryCredentials();
    if (this._skipAuth || credentials.length > 0) {
      return;
    }

    await this._dispatch(
      createIntent(LayoutAction.AddToast, {
        part: 'toast',
        subject: {
          id: 'passkey-setup-toast',
          title: ['passkey setup toast title', { ns: WELCOME_PLUGIN }],
          description: ['passkey setup toast description', { ns: WELCOME_PLUGIN }],
          duration: Infinity,
          icon: 'ph--key--regular',
          closeLabel: ['close label', { ns: 'os' }],
          actionLabel: ['passkey setup toast action label', { ns: WELCOME_PLUGIN }],
          actionAlt: ['passkey setup toast action alt', { ns: WELCOME_PLUGIN }],
          onAction: () => {
            const intent = pipe(
              createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: Account.id }),
              chain(LayoutAction.Open, { part: 'main', subject: [Account.Security] }),
            );
            void this._dispatch(intent);
          },
        },
      }),
    );
  }

  private async _fetchBetaCredential() {
    const credentials = await queryAllCredentials(this._client);
    this._setCredential(credentials);
  }

  private _setCredential(credentials: Credential[]) {
    const credential = credentials
      .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
      .find(matchServiceCredential(['composer:beta']));
    if (credential) {
      this._credential = credential;
      // Ensure that if the credential is ever found that onboarding is closed to the app is accessible.
      void this._closeWelcome();
    }
  }

  private async _upgradeCredential() {
    try {
      invariant(this._hubUrl);
      // TODO(wittjosiah): If id is required to present credentials, then it should always be present for queried credentials.
      invariant(this._credential?.id, 'beta credential missing id');
      const presentation = await this._client.halo.presentCredentials({ ids: [this._credential.id] });
      const { capabilities } = await getProfile({ hubUrl: this._hubUrl, presentation });
      const newCapabilities = capabilities.filter(
        (capability) => !this._credential!.subject.assertion.capabilities.includes(capability),
      );
      if (newCapabilities.length > 0) {
        log('upgrading beta credential', { newCapabilities });
        const newCredential = await upgradeCredential({ hubUrl: this._hubUrl, presentation });
        await this._client.halo.writeCredentials([newCredential]);
      }
    } catch (err) {
      // If failed to upgrade, log the error and continue. Most likely offline.
      log.catch(err);
    }
  }

  private async _activateAccount() {
    try {
      invariant(this._hubUrl);
      invariant(this._identity);
      const credential = await activateAccount({ hubUrl: this._hubUrl, identity: this._identity, token: this._token });
      await this._client.halo.writeCredentials([credential]);
      log.info('beta credential saved', { credential });
      this._token && removeQueryParamByValue(this._token);
      this._tokenType && removeQueryParamByValue(this._tokenType);
    } catch {
      // No-op. This is expected for referred users who have an identity but no token yet.
    }
  }

  private async _login() {
    invariant(this._token);
    await this._dispatch(createIntent(ClientAction.RedeemToken, { token: this._token }));
    this._token && removeQueryParamByValue(this._token);
    this._tokenType && removeQueryParamByValue(this._tokenType);
  }

  private async _showWelcome() {
    // NOTE: Active parts cannot contain '/' characters currently.
    await this._dispatch(
      createIntent(LayoutAction.SetLayoutMode, {
        part: 'mode',
        subject: `surface:${WELCOME_SCREEN}`,
        options: { mode: 'fullscreen' },
      }),
    );
  }

  private async _closeWelcome() {
    await this._dispatch(
      createIntent(LayoutAction.Close, {
        part: 'main',
        subject: [`surface:${WELCOME_SCREEN}`],
        options: { state: false },
      }),
    );
  }

  private async _createIdentity() {
    await this._dispatch(createIntent(ClientAction.CreateIdentity));
  }

  private async _createAgent() {
    const devices = this._client.halo.devices.get();
    const edgeAgent = devices.find(
      (device) => device.profile?.type === DeviceType.AGENT_MANAGED && device.profile?.os?.toUpperCase() === 'EDGE',
    );
    if (edgeAgent) {
      return;
    }

    await this._dispatch(createIntent(ClientAction.CreateAgent));
  }

  private async _openJoinIdentity() {
    invariant(this._deviceInvitationCode !== undefined);

    await this._dispatch(createIntent(ClientAction.JoinIdentity, { invitationCode: this._deviceInvitationCode }));

    removeQueryParamByValue(this._deviceInvitationCode);
  }

  private async _openRecoverIdentity() {
    await this._dispatch(createIntent(ClientAction.RecoverIdentity));

    removeQueryParamByValue('true');
  }

  private async _openJoinSpace() {
    invariant(this._spaceInvitationCode);

    await this._dispatch(createIntent(SpaceAction.Join, { invitationCode: this._spaceInvitationCode }));

    removeQueryParamByValue(this._spaceInvitationCode);
  }

  private async _startHelp() {
    if (this._skipAuth) {
      return;
    }

    await this._dispatch(createIntent(HelpAction.Start));
  }
}
