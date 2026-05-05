//
// Copyright 2024 DXOS.org
//

import { type Capabilities } from '@dxos/app-framework';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { SubscriptionList, type Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientOperation } from '@dxos/plugin-client/operations';
import { Account } from '@dxos/plugin-client/types';
import { HelpOperation } from '@dxos/plugin-help/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type Client } from '@dxos/react-client';
import { type Credential, DeviceType, type Identity } from '@dxos/react-client/halo';
import { osTranslations } from '@dxos/ui-theme';

import { queryAllCredentials, removeQueryParamByValue } from '../../util';
import { WELCOME_SCREEN } from './components';
import { OVERLAY_CLASSES, OVERLAY_STYLE } from './components/Welcome/Welcome';
import { meta } from './meta';

export type OnboardingManagerProps = {
  invokePromise: Capabilities.OperationInvoker['invokePromise'];
  client: Client;
  firstRun?: Trigger;
  hubUrl?: string;
  token?: string;
  tokenType?: 'login';
  recoverIdentity?: boolean;
  deviceInvitationCode?: string;
  spaceInvitationCode?: string;
  /**
   * Account invitation code redeemed during signup. Drives the new account-gated
   * flow: identity is created locally only after the code validates, then the
   * code + identity + email are bound to a Hub Account.
   */
  accountInvitationCode?: string;
  /** Email associated with the new account; required when accountInvitationCode is set. */
  email?: string;
};

export class OnboardingManager {
  private readonly _ctx = new Context();
  private readonly _subscriptions = new SubscriptionList();
  private readonly _invokePromise: Capabilities.OperationInvoker['invokePromise'];
  private readonly _client: Client;
  private readonly _hubUrl?: string;
  private readonly _skipAuth: boolean;
  private readonly _token?: string;
  private readonly _tokenType?: 'login' | 'verify';
  private readonly _recoverIdentity?: boolean;
  private readonly _deviceInvitationCode?: string;
  private readonly _spaceInvitationCode?: string;
  private readonly _accountInvitationCode?: string;
  private readonly _email?: string;

  private _identity: Identity | null = null;
  /**
   * Set by {@link destroy}. `initialize` checks this at every `await` boundary
   * so it bails out instead of mutating state after the manager has been torn
   * down. Necessary because `WelcomeCapabilities.Onboarding` contributes the
   * manager synchronously and runs `initialize()` as a fire-and-forget
   * background side-effect — `destroy()` can fire while async work is still
   * in flight.
   */
  private _destroyed = false;

  constructor({
    invokePromise,
    client,
    hubUrl,
    token,
    tokenType,
    recoverIdentity,
    deviceInvitationCode,
    spaceInvitationCode,
    accountInvitationCode,
    email,
  }: OnboardingManagerProps) {
    this._ctx.onDispose(() => this._subscriptions.clear());

    this._invokePromise = invokePromise;
    this._client = client;
    this._hubUrl = hubUrl;
    this._skipAuth = !this._hubUrl;
    this._token = token;
    this._tokenType = tokenType;
    this._recoverIdentity = recoverIdentity || false;
    this._deviceInvitationCode = deviceInvitationCode;
    this._spaceInvitationCode = spaceInvitationCode;
    this._accountInvitationCode = accountInvitationCode;
    this._email = email;

    this._subscriptions.add(
      this._client.halo.identity.subscribe((identity) => {
        if (this._destroyed) {
          return;
        }
        const wasNull = this._identity === null;
        this._identity = identity;

        // The gate is identity-presence: the moment a local identity exists, dismiss
        // the welcome dialog. Account binding / activation can complete asynchronously.
        if (identity && wasNull) {
          void this._closeWelcome();
        }
      }).unsubscribe,
    );
  }

  async initialize(): Promise<void> {
    // Helper used between every async step so a `destroy()` issued mid-flight
    // (e.g. plugin reset, HMR) short-circuits before any state mutation. We
    // can't actually cancel the in-flight RPC, but bailing here prevents
    // post-destroy writes to `this._identity` and stops the cascade of
    // dependent steps.
    const aborted = () => this._destroyed;

    // Gate: a local identity grants access. Account binding / authed-services access
    // is checked separately on the profile page (where users without an account see
    // a "no edge access" warning + request-access form).
    if (this._identity) {
      // For users who already have a local identity but a fresh `?email=...`
      // URL param: hand it to the redeem endpoint, which is idempotent (the
      // server may auto-bind, return a login token, or reject -- we swallow
      // failures since the resulting state is what we wanted).
      if (this._email && this._hubUrl) {
        await this._bindExistingIdentityIfPossible();
        if (aborted()) {
          return;
        }
      }
      // Automatically start join space flow if already authed.
      if (this._spaceInvitationCode) {
        await this._openJoinSpace();
        if (aborted()) {
          return;
        }
      }
      // Ensure that recovery credential is present.
      await this._setupRecovery();
      if (aborted()) {
        return;
      }
      // Ensure that agent is present.
      await this._createAgent();
      return;
    } else if (!this._skipAuth) {
      // No identity yet: show welcome screen.
      await this._showWelcome();
      if (aborted()) {
        return;
      }
    }

    if (this._deviceInvitationCode !== undefined) {
      // If device invitation code is present, open join identity flow.
      await this._openJoinIdentity();
    } else if (this._recoverIdentity) {
      // If recovery flag is present, open recover identity flow.
      await this._openRecoverIdentity();
    } else if (!this._identity && this._email && this._accountInvitationCode) {
      // URL-driven signup: `?accountInvitationCode=...&email=...`. The user
      // landed here from the invitation email; redeem the code with the
      // emailed address.
      await this._redeemAccountInvitation();
      await this._setupRecovery();
      await this._startHelp();
      await this._createAgent();
    } else if (!this._identity && this._skipAuth) {
      // Auth disabled (e.g. integration tests): just bring up a fresh identity.
      await this._createIdentity();
      if (aborted()) {
        return;
      }
      await this._setupRecovery();
      if (aborted()) {
        return;
      }
      await this._startHelp();
      if (aborted()) {
        return;
      }
      await this._createAgent();
    } else if (!this._identity && this._token && this._tokenType === 'login') {
      // Login flow: redeem the recovery token from `/account/login` to restore
      // the existing identity. Awaiting `_login()` lets HALO finish replicating
      // any pre-existing IdentityRecovery credentials before `_setupRecovery`
      // checks them, so we don't prompt a user who already has a passkey.
      await this._login();
      await this._setupRecovery();
    }
    if (aborted()) {
      return;
    }

    if (this._skipAuth && this._spaceInvitationCode) {
      // If skipping auth and a space invitation code is present, open join space flow.
      await this._openJoinSpace();
    }
  }

  async destroy(): Promise<void> {
    this._destroyed = true;
    await this._ctx.dispose();
  }

  private async _queryRecoveryCredentials(): Promise<Credential[]> {
    const credentials = await queryAllCredentials(this._client);
    return credentials.filter(
      (credential) => credential.subject.assertion['@type'] === 'dxos.halo.credentials.IdentityRecovery',
    );
  }

  private async _setupRecovery(): Promise<void> {
    const credentials = await this._queryRecoveryCredentials();
    if (this._skipAuth || credentials.length > 0) {
      return;
    }

    await this._invokePromise(LayoutOperation.AddToast, {
      id: 'passkey-setup-toast',
      title: ['passkey-setup-toast.title', { ns: meta.id }],
      description: ['passkey-setup-toast.description', { ns: meta.id }],
      duration: Infinity,
      icon: 'ph--key--regular',
      closeLabel: ['close.label', { ns: osTranslations }],
      actionLabel: ['passkey-setup-toast-action.label', { ns: meta.id }],
      actionAlt: ['passkey-setup-toast-action.alt', { ns: meta.id }],
      onAction: async () => {
        await this._invokePromise(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(Account.id) });
        await this._invokePromise(LayoutOperation.Open, {
          subject: [`${getSpacePath(Account.id)}/${Account.Security}`],
        });
      },
    });
  }

  private async _login(): Promise<void> {
    invariant(this._token);
    await this._invokePromise(ClientOperation.RedeemToken, { token: this._token });
    this._token && removeQueryParamByValue(this._token);
    this._tokenType && removeQueryParamByValue(this._tokenType);
  }

  /**
   * Redeem an invitation code via `/account/invitation-code/redeem`. Probe
   * first (no identityKey) so the server can return a recovery `loginToken`
   * if the email already maps to an Account; otherwise create the local
   * identity and bind it.
   */
  private async _redeemAccountInvitation(): Promise<void> {
    invariant(this._email);
    invariant(this._hubUrl, 'hubUrl required for redemption');

    const probe = await this._postRedeem({
      email: this._email,
      code: this._accountInvitationCode,
    });
    if ('loginToken' in probe) {
      await this._invokePromise(ClientOperation.RedeemToken, { token: probe.loginToken });
      removeQueryParamByValue(this._email);
      this._accountInvitationCode && removeQueryParamByValue(this._accountInvitationCode);
      return;
    }

    await this._createIdentity();
    invariant(this._identity, 'identity should exist after create');

    const result = await this._postRedeem({
      email: this._email,
      identityKey: this._identity.identityKey.toHex(),
      code: this._accountInvitationCode,
    });
    if ('loginToken' in result) {
      await this._invokePromise(ClientOperation.RedeemToken, { token: result.loginToken });
    } else if ('accountId' in result) {
      log.info('account redeemed', { accountId: result.accountId });
    }

    this._accountInvitationCode && removeQueryParamByValue(this._accountInvitationCode);
    removeQueryParamByValue(this._email);
  }

  /**
   * Hand an already-existing local identity + a freshly-arrived email to the
   * redeem endpoint. Idempotent: if the server can't bind for whatever reason
   * we swallow the error since the resulting state is what we wanted.
   */
  private async _bindExistingIdentityIfPossible(): Promise<void> {
    invariant(this._email);
    invariant(this._identity);
    invariant(this._hubUrl);

    try {
      const result = await this._postRedeem({
        email: this._email,
        identityKey: this._identity.identityKey.toHex(),
        code: this._accountInvitationCode,
      });
      if ('accountId' in result) {
        log.info('account bound to existing identity', { accountId: result.accountId });
      }
    } catch (err: any) {
      log.info('skipped binding existing identity', { error: err?.data?.type ?? err?.message });
    }
    removeQueryParamByValue(this._email);
  }

  private async _postRedeem(body: {
    email: string;
    code?: string;
    identityKey?: string;
  }): Promise<
    { accountId: string; emailVerificationSent: boolean } | { loginToken: string } | { needsIdentity: true }
  > {
    invariant(this._hubUrl);
    const url = new URL('/account/invitation-code/redeem', this._hubUrl);
    log.info('redeeming account invitation', { url: url.href, hasCode: !!body.code, hasIdentity: !!body.identityKey });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let envelope: { success: boolean; message?: string; data?: any };
    try {
      envelope = (await response.json()) as { success: boolean; message?: string; data?: any };
    } catch (parseErr) {
      log.error('redeem response was not JSON', { status: response.status, statusText: response.statusText });
      throw new Error(`Account redemption failed: HTTP ${response.status} (non-JSON response)`);
    }
    if (!envelope.success) {
      log.error('account redemption failed', {
        status: response.status,
        message: envelope.message,
        data: envelope.data,
      });
      const error: any = new Error(`Account redemption failed: ${envelope.message ?? 'unknown error'}`);
      error.data = envelope.data;
      throw error;
    }
    log.info('account redemption ok', { data: envelope.data });
    return envelope.data;
  }

  private async _showWelcome(): Promise<void> {
    // NOTE: Active parts cannot contain '/' characters currently.
    await this._invokePromise(LayoutOperation.UpdateDialog, {
      subject: WELCOME_SCREEN,
      type: 'alert',
      overlayClasses: OVERLAY_CLASSES,
      overlayStyle: OVERLAY_STYLE,
    });
  }

  private async _closeWelcome(): Promise<void> {
    await this._invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }

  private async _createIdentity(): Promise<void> {
    await this._invokePromise(ClientOperation.CreateIdentity, {});
  }

  private async _createAgent(): Promise<void> {
    const devices = this._client.halo.devices.get();
    const edgeAgent = devices.find(
      (device) => device.profile?.type === DeviceType.AGENT_MANAGED && device.profile?.os?.toUpperCase() === 'EDGE',
    );
    if (edgeAgent) {
      return;
    }

    await this._invokePromise(ClientOperation.CreateAgent);
  }

  private async _openJoinIdentity(): Promise<void> {
    invariant(this._deviceInvitationCode !== undefined);

    await this._invokePromise(ClientOperation.JoinIdentity, { invitationCode: this._deviceInvitationCode });

    removeQueryParamByValue(this._deviceInvitationCode);
  }

  private async _openRecoverIdentity(): Promise<void> {
    await this._invokePromise(ClientOperation.RecoverIdentity);

    removeQueryParamByValue('true');
  }

  private async _openJoinSpace(): Promise<void> {
    invariant(this._spaceInvitationCode);

    await this._invokePromise(SpaceOperation.Join, { invitationCode: this._spaceInvitationCode });

    removeQueryParamByValue(this._spaceInvitationCode);
  }

  private async _startHelp(): Promise<void> {
    if (this._skipAuth) {
      return;
    }

    await this._invokePromise(HelpOperation.Start);
  }
}
