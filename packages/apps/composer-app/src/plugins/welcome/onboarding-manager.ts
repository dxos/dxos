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
import { isTestEmail } from '@dxos/protocols';
import { type Client } from '@dxos/react-client';
import { type Credential, DeviceType, type Identity } from '@dxos/react-client/halo';
import { osTranslations } from '@dxos/ui-theme';

import { queryAllCredentials, removeQueryParamByValue } from '../../util';
import { WELCOME_SCREEN } from './components';
import { OVERLAY_CLASSES, OVERLAY_STYLE } from './components/Welcome/Welcome';
import { activateAccount, getProfile, matchServiceCredential, upgradeCredential } from './credentials';
import { meta } from './meta';

export type OnboardingManagerProps = {
  invokePromise: Capabilities.OperationInvoker['invokePromise'];
  client: Client;
  firstRun?: Trigger;
  hubUrl?: string;
  token?: string;
  tokenType?: 'login' | 'verify';
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
  private _credential: Credential | null = null;

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
        const wasNull = this._identity === null;
        this._identity = identity;

        // The gate is identity-presence: the moment a local identity exists, dismiss
        // the welcome dialog. Account binding / activation can complete asynchronously.
        if (identity && wasNull) {
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

  async initialize(): Promise<void> {
    await this._fetchBetaCredential();

    // Gate: a local identity grants access. Account binding / authed-services access
    // is checked separately on the profile page (where users without an account see
    // a "no edge access" warning + request-access form).
    if (this._identity) {
      // Test-email binding for users who already have a local identity (e.g. legacy
      // users from before account-gating, or anyone who created an identity via the
      // verify-token path). Bind the existing identity to a test Account by calling
      // the redeem endpoint with the current identityKey + email. Idempotent:
      // server returns email_already_registered if already bound.
      if (this._email && isTestEmail(this._email) && this._hubUrl) {
        await this._bindExistingIdentityToTestAccount();
      }
      // Best-effort beta credential upgrade for legacy users.
      if (this._credential && this._hubUrl) {
        void this._upgradeCredential();
      }
      // Automatically start join space flow if already authed.
      this._spaceInvitationCode && (await this._openJoinSpace());
      // Ensure that recovery credential is present.
      await this._setupRecovery();
      // Ensure that agent is present.
      await this._createAgent();
      return;
    } else if (!this._skipAuth) {
      // No identity yet: show welcome screen.
      await this._showWelcome();
    }

    if (this._deviceInvitationCode !== undefined) {
      // If device invitation code is present, open join identity flow.
      await this._openJoinIdentity();
    } else if (this._recoverIdentity) {
      // If recovery flag is present, open recover identity flow.
      await this._openRecoverIdentity();
    } else if (!this._identity && this._email && (this._accountInvitationCode || isTestEmail(this._email))) {
      // Account creation: either invitation-code-driven (regular users) or auto-admit (test emails).
      // The server's redeem endpoint handles both: test emails skip code validation, and the
      // server may return a login token for existing test accounts (recovery instead of create).
      await this._redeemAccountInvitation();
      await this._setupRecovery();
      await this._startHelp();
      await this._createAgent();
    } else if (!this._identity && ((this._token && this._tokenType === 'verify') || this._skipAuth)) {
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

  async destroy(): Promise<void> {
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

  private async _fetchBetaCredential(): Promise<void> {
    const credentials = await queryAllCredentials(this._client);
    this._setCredential(credentials);
  }

  private _setCredential(credentials: Credential[]): void {
    const credential = credentials
      .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
      .find(matchServiceCredential(['composer:beta']));
    if (credential) {
      this._credential = credential;
      // Ensure that if the credential is ever found that onboarding is closed to the app is accessible.
      void this._closeWelcome();
    }
  }

  private async _upgradeCredential(): Promise<void> {
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

  private async _activateAccount(): Promise<void> {
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

  private async _login(): Promise<void> {
    invariant(this._token);
    await this._invokePromise(ClientOperation.RedeemToken, { token: this._token });
    this._token && removeQueryParamByValue(this._token);
    this._tokenType && removeQueryParamByValue(this._tokenType);
  }

  /**
   * Account creation via `/account/invitation-code/redeem` on hub-service. The endpoint
   * is unauthenticated, so we hit it with plain fetch using `_hubUrl`. Handles both
   * regular (code-required) and test-email (code-bypassed) signups:
   *
   * - Test email + existing Account → server returns `{ loginToken }`; we redeem it
   *   to recover the existing identity (no local identity is created beforehand).
   * - Test email + new → server returns `{ needsIdentity: true }` on the first probe,
   *   we create an identity locally, then call again with `identityKey` so the server
   *   binds a fresh test Account.
   * - Non-test email → we create an identity locally and call once with code+identityKey;
   *   server validates the code and binds the Account.
   */
  private async _redeemAccountInvitation(): Promise<void> {
    invariant(this._email);
    invariant(this._hubUrl, 'hubUrl required for redemption');
    const isTest = isTestEmail(this._email);

    // For test emails, probe first (no identityKey) to detect the recovery case.
    if (isTest) {
      const probe = await this._postRedeem({ email: this._email });
      if ('loginToken' in probe) {
        // Existing test Account: redeem the login token to recover the identity.
        await this._invokePromise(ClientOperation.RedeemToken, { token: probe.loginToken });
        removeQueryParamByValue(this._email);
        return;
      }
      // Otherwise probe responded with `needsIdentity: true` -- fall through to create+bind.
    } else {
      invariant(this._accountInvitationCode, 'accountInvitationCode required for non-test signup');
    }

    await this._createIdentity();
    invariant(this._identity, 'identity should exist after create');

    const result = await this._postRedeem({
      email: this._email,
      identityKey: this._identity.identityKey.toHex(),
      code: this._accountInvitationCode,
    });

    if ('loginToken' in result) {
      // Race: the server saw an existing account between our probe and the bind call.
      await this._invokePromise(ClientOperation.RedeemToken, { token: result.loginToken });
    } else if ('accountId' in result) {
      log.info('account redeemed', { accountId: result.accountId });
    } else {
      log.warn('unexpected redeem response', { result });
    }

    this._accountInvitationCode && removeQueryParamByValue(this._accountInvitationCode);
    removeQueryParamByValue(this._email);
  }

  /**
   * Bind an already-existing local identity to a test Account. Used when a legacy user
   * (identity created before account-gating) wants to register with a test email,
   * or to manually re-bind an unbound identity.
   *
   * Idempotent: if the email already maps to this identity (or any identity), the
   * server returns `email_already_registered` / `identity_already_associated`; we
   * swallow those since the resulting state is what we wanted.
   */
  private async _bindExistingIdentityToTestAccount(): Promise<void> {
    invariant(this._email);
    invariant(this._identity);
    invariant(this._hubUrl);

    try {
      const result = await this._postRedeem({
        email: this._email,
        identityKey: this._identity.identityKey.toHex(),
      });
      if ('accountId' in result) {
        log.info('test account bound to existing identity', { accountId: result.accountId });
      } else if ('loginToken' in result) {
        log.warn('test email already bound to a different identity; ignoring login token', {
          email: this._email,
        });
      }
    } catch (err: any) {
      const code = err?.data?.type;
      if (code === 'email_already_registered' || code === 'identity_already_associated') {
        log.info('test account already bound', { email: this._email, code });
        return;
      }
      log.error('failed to bind existing identity to test account', { error: err });
    }
    removeQueryParamByValue(this._email);
  }

  private async _postRedeem(body: {
    email: string;
    code?: string;
    identityKey?: string;
  }): Promise<
    | { accountId: string; emailVerificationSent: boolean }
    | { loginToken: string }
    | { needsIdentity: true }
  > {
    invariant(this._hubUrl);
    const url = new URL('/account/invitation-code/redeem', this._hubUrl);
    log.info('redeeming account invitation', { url: url.href, email: body.email, hasCode: !!body.code, hasIdentity: !!body.identityKey });
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
      log.error('account redemption failed', { status: response.status, message: envelope.message, data: envelope.data });
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
