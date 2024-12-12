//
// Copyright 2024 DXOS.org
//

import { type IntentDispatcher, type Layout, LayoutAction, NavigationAction } from '@dxos/app-framework';
import { EventSubscriptions, type Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { CLIENT_PLUGIN, ClientAction } from '@dxos/plugin-client/meta';
import { HELP_PLUGIN, HelpAction } from '@dxos/plugin-help/meta';
import { SPACE_PLUGIN, SpaceAction } from '@dxos/plugin-space';
import { type Client } from '@dxos/react-client';
import { type Credential, type Identity } from '@dxos/react-client/halo';

import { activateAccount, getProfile, matchServiceCredential, upgradeCredential } from './credentials';
import { queryAllCredentials, removeQueryParamByValue } from '../../util';

export type OnboardingManagerParams = {
  dispatch: IntentDispatcher;
  client: Client;
  layout: Layout;
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
  private readonly _dispatch: IntentDispatcher;
  private readonly _client: Client;
  private readonly _layout: Layout;
  private readonly _firstRun?: Trigger;
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
    layout,
    firstRun,
    hubUrl,
    token,
    recoverIdentity,
    deviceInvitationCode,
    spaceInvitationCode,
  }: OnboardingManagerParams) {
    this._ctx.onDispose(() => this._subscriptions.clear());

    this._dispatch = dispatch;
    this._client = client;
    this._layout = layout;
    this._firstRun = firstRun;
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
      await this._upgradeCredential();
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
    await this._dispatch([
      {
        action: LayoutAction.SET_LAYOUT_MODE,
        data: { layoutMode: 'fullscreen' },
      },
      {
        action: NavigationAction.OPEN,
        // NOTE: Active parts cannot contain '/' characters currently.
        data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
      },
    ]);
  }

  private async _closeWelcome() {
    await this._dispatch([
      ...(this._layout.layoutMode !== 'deck'
        ? [
            {
              action: LayoutAction.SET_LAYOUT_MODE,
              data: { layoutMode: 'solo' },
            },
          ]
        : []),
      {
        action: NavigationAction.CLOSE,
        data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
      },
    ]);
  }

  private async _createIdentity() {
    await this._dispatch({
      plugin: CLIENT_PLUGIN,
      action: ClientAction.CREATE_IDENTITY,
    });
    this._firstRun?.wake();
  }

  private async _createRecoveryCode() {
    await this._dispatch({
      plugin: CLIENT_PLUGIN,
      action: ClientAction.CREATE_RECOVERY_CODE,
    });
  }

  private async _createAgent() {
    await this._dispatch({
      plugin: CLIENT_PLUGIN,
      action: ClientAction.CREATE_AGENT,
    });
  }

  private async _openJoinIdentity() {
    invariant(this._deviceInvitationCode !== undefined);

    await this._dispatch({
      plugin: CLIENT_PLUGIN,
      action: ClientAction.JOIN_IDENTITY,
      data: { invitationCode: this._deviceInvitationCode },
    });

    removeQueryParamByValue(this._deviceInvitationCode);
  }

  private async _openRecoverIdentity() {
    await this._dispatch({
      plugin: CLIENT_PLUGIN,
      action: ClientAction.RECOVER_IDENTITY,
    });

    removeQueryParamByValue('true');
  }

  private async _openJoinSpace() {
    invariant(this._spaceInvitationCode);

    await this._dispatch({
      plugin: SPACE_PLUGIN,
      action: SpaceAction.JOIN,
      data: { invitationCode: this._spaceInvitationCode },
    });

    removeQueryParamByValue(this._spaceInvitationCode);
  }

  private async _startHelp() {
    await this._dispatch({
      plugin: HELP_PLUGIN,
      action: HelpAction.START,
    });
  }
}
