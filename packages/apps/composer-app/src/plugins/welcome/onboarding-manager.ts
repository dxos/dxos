//
// Copyright 2024 DXOS.org
//

import {
  Capabilities,
  createIntent,
  LayoutAction,
  type PluginsContext,
  type PromiseIntentDispatcher,
} from '@dxos/app-framework';
import { EventSubscriptions, type Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientAction } from '@dxos/plugin-client/types';
import { HelpAction } from '@dxos/plugin-help/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Client } from '@dxos/react-client';
import { type Credential, type Identity } from '@dxos/react-client/halo';

import { WELCOME_SCREEN } from './components';
import { activateAccount, getProfile, matchServiceCredential, upgradeCredential } from './credentials';
import { queryAllCredentials, removeQueryParamByValue } from '../../util';

export type OnboardingManagerParams = {
  dispatch: PromiseIntentDispatcher;
  client: Client;
  context: PluginsContext;
  firstRun?: Trigger;
  hubUrl?: string;
  token?: string;
  recoverIdentity?: boolean;
  deviceInvitationCode?: string;
  spaceInvitationCode?: string;
};

export class OnboardingManager {
  private readonly _ctx = new Context();
  private readonly _subscriptions = new EventSubscriptions();
  private readonly _dispatch: PromiseIntentDispatcher;
  private readonly _client: Client;
  private readonly _context: PluginsContext;
  private readonly _hubUrl?: string;
  private readonly _skipAuth: boolean;
  private readonly _token?: string;
  private readonly _recoverIdentity?: boolean;
  private readonly _deviceInvitationCode?: string;
  private readonly _spaceInvitationCode?: string;

  private _identity: Identity | null = null;
  private _credential: Credential | null = null;

  constructor({
    dispatch,
    client,
    context,
    hubUrl,
    token,
    recoverIdentity,
    deviceInvitationCode,
    spaceInvitationCode,
  }: OnboardingManagerParams) {
    this._ctx.onDispose(() => this._subscriptions.clear());

    this._dispatch = dispatch;
    this._client = client;
    this._context = context;
    this._hubUrl = hubUrl;
    this._skipAuth = ['main', 'labs'].includes(client.config.values.runtime?.app?.env?.DX_ENVIRONMENT) || !this._hubUrl;
    this._token = token;
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
    await this.fetchCredential();
    if (this._credential && this._hubUrl) {
      // Don't block app loading on network request.
      void this._upgradeCredential();
      this._spaceInvitationCode && (await this._openJoinSpace());
      return;
    } else if (!this._skipAuth) {
      await this._showWelcome();
    }

    if (this._deviceInvitationCode !== undefined) {
      await this._openJoinIdentity();
    } else if (this._recoverIdentity) {
      await this._openRecoverIdentity();
    } else if (!this._identity && (this._token || this._skipAuth)) {
      await this._createIdentity();
      await this._createRecoveryCode();
      !this._skipAuth && (await this._startHelp());
      await this._createAgent();
    }

    if (this._skipAuth) {
      this._spaceInvitationCode && (await this._openJoinSpace());
      return;
    }

    if (this._identity) {
      await this._activateAccount();
    }
  }

  async destroy() {
    await this._ctx.dispose();
  }

  async fetchCredential() {
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
    } catch (error) {
      // If failed to upgrade, log the error and continue. Most likely offline.
      log.catch(error);
    }
  }

  private async _activateAccount() {
    try {
      invariant(this._hubUrl);
      invariant(this._identity);
      const credential = await activateAccount({ hubUrl: this._hubUrl, identity: this._identity, token: this._token });
      await this._client.halo.writeCredentials([credential]);
      log('beta credential saved', { credential });
      this._token && removeQueryParamByValue(this._token);
    } catch {
      // No-op. This is expected for referred users who have an identity but no token yet.
    }
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
    const layout = this._context.requestCapability(Capabilities.Layout);
    await this._dispatch(
      createIntent(LayoutAction.Close, {
        part: 'main',
        subject: [`surface:${WELCOME_SCREEN}`],
        options: { state: false },
      }),
    );
    if (layout.mode !== 'deck') {
      await this._dispatch(createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'solo' } }));
    }
  }

  private async _createIdentity() {
    await this._dispatch(createIntent(ClientAction.CreateIdentity));
  }

  private async _createRecoveryCode() {
    await this._dispatch(createIntent(ClientAction.CreateRecoveryCode));
  }

  private async _createAgent() {
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
    await this._dispatch(createIntent(HelpAction.Start));
  }
}
