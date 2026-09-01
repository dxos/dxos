//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as HubAccount from '@dxos/app-toolkit/Account';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { SubscriptionList, type Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Credential, DeviceType, type Identity } from '@dxos/client/halo';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as Account from '@dxos/plugin-client/Account';
import { ClientOperation } from '@dxos/plugin-client/ClientOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as HelpOperation from '@dxos/plugin-support/HelpOperation';
import { osTranslations } from '@dxos/ui-theme';

import hero from '../assets/hero.webp?url';
import { AUTHORIZING_DEVICE_DIALOG, WELCOME_SCREEN } from './constants.ts';
import { meta } from './meta.ts';
import { isInvalidRecoveryToken, queryAllCredentials, removeQueryParamByValue } from './util.ts';

export type OnboardingManagerProps = {
  invokePromise: Capabilities.OperationInvoker['invokePromise'];
  client: Client;
  firstRun?: Trigger;
  hubUrl?: string;
  token?: string;
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
  private readonly _recoverIdentity?: boolean;
  private readonly _deviceInvitationCode?: string;
  private readonly _spaceInvitationCode?: string;
  private readonly _accountInvitationCode?: string;
  private readonly _email?: string;

  private _identity: Identity | null = null;
  /**
   * Set by {@link destroy}. `initialize` checks this at every `await` boundary
   * so it bails out instead of mutating state after the manager has been torn
   * down. Necessary because `OnboardingCapabilities.Onboarding` contributes the
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
    this._recoverIdentity = recoverIdentity || false;
    this._deviceInvitationCode = deviceInvitationCode;
    this._spaceInvitationCode = spaceInvitationCode;
    this._accountInvitationCode = accountInvitationCode;
    this._email = email;

    this._identity = this._client.halo.identity.get();

    const subscription = this._client.halo.identity.subscribe((identity) => {
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
    });
    // Bound closure: a detached `subscription.unsubscribe` loses its receiver and throws on dispose.
    this._subscriptions.add(() => subscription.unsubscribe());
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
      // A device invitation targets a different identity, so accepting it requires a storage
      // reset; confirm via the reset dialog rather than dropping the invitation silently. Stop
      // here — no recovery/agent provisioning for an identity the user may be about to abandon.
      if (this._deviceInvitationCode !== undefined) {
        await this._confirmJoinNewIdentity();
        return;
      }
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
    } else if (!this._skipAuth && this._deviceInvitationCode === undefined) {
      // No identity yet: show welcome. Skipped when a device invitation is pending, since both dialog
      // updates then race through the operation layer and a welcome landing second hides the join.
      // A `?token=...` param means a magic-link redemption is about to run: show the "authorizing"
      // dialog instead of the login form, so the multi-second server + HALO-replication wait doesn't
      // look like a stuck login gate.
      if (this._token) {
        await this._showAuthorizingDevice();
      } else {
        await this._showWelcome();
      }
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
      if (await this._redeemAccountInvitation()) {
        await this._setupRecovery();
        await this._startHelp();
        await this._createAgent();
      }
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
    } else if (!this._identity && this._token) {
      // Login flow: redeem the recovery token from `/account/login` to restore
      // the existing identity. Awaiting `_login()` lets HALO finish replicating
      // any pre-existing IdentityRecovery credentials before `_setupRecovery`
      // checks them, so we don't prompt a user who already has a passkey.
      const result = await this._login();
      if (result === 'ok') {
        await this._setupRecovery();
      } else {
        // Fall back to the login form rather than leaving the user on the "authorizing" dialog forever.
        await this._showLoginFailedToast(result);
        await this._showWelcome();
      }
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
      title: ['passkey-setup-toast.title', { ns: meta.profile.key }],
      description: ['passkey-setup-toast.description', { ns: meta.profile.key }],
      duration: Infinity,
      icon: 'ph--key--regular',
      closeLabel: ['close.label', { ns: osTranslations }],
      actionLabel: ['passkey-setup-toast-action.label', { ns: meta.profile.key }],
      actionAlt: ['passkey-setup-toast-action.alt', { ns: meta.profile.key }],
      onAction: async () => {
        await this._invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(Account.id) });
        await this._invokePromise(LayoutOperation.Open, {
          subject: [GraphPath.getSpacePath(Account.id, Account.Security)],
        });
      },
    });
  }

  /** `invokePromise` resolves with `{ error }` rather than rejecting, so the result must be
   * inspected or a failed redemption is silently swallowed. */
  private async _login(): Promise<'ok' | 'invalid-token' | 'failed'> {
    invariant(this._token);
    const { error } = await this._invokePromise(ClientOperation.RedeemToken, { token: this._token });
    removeQueryParamByValue(this._token);
    removeQueryParamByValue('login');
    if (error) {
      log.warn('token redemption failed', { error });
      return isInvalidRecoveryToken(error) ? 'invalid-token' : 'failed';
    }
    return 'ok';
  }

  /**
   * Redeem an invitation code via `/account/invitation-code/redeem`. Create a
   * fresh local identity and bind it. Account restoration is intentionally not
   * supported on this path -- magic-link login (`/account/login`) handles
   * recovery for real emails, and test emails are always fresh (no restore).
   *
   * Resolves false when the signup did not complete — the email already has an
   * account (the welcome dialog stays open so the user can log in instead), the
   * probe was inconclusive, or identity creation / redemption failed; in the latter
   * cases the URL params are left intact so a reload retries the signup.
   */
  private async _redeemAccountInvitation(): Promise<boolean> {
    invariant(this._email);
    invariant(this._hubUrl, 'hubUrl required for redemption');

    const { _email: email, _accountInvitationCode: code } = this;
    const ensureIdentity = Effect.gen({ self: this }, function* () {
      yield* Effect.tryPromise(() => this._createIdentity());
      invariant(this._identity, 'identity should exist after create');
      return this._identity;
    });

    // Errors are mapped inside the Effect — `runPromise` rejects with a FiberFailure, so the
    // typed errors are not matchable from a catch block. The catch-all matters: `initialize()` is a
    // fire-and-forget background side-effect, so a rejection here would vanish unhandled.
    const outcome = await EffectEx.runPromise(
      HubAccount.signUpWithEmail({ hub: HubAccount.createHubClient(this._hubUrl), email, code, ensureIdentity }).pipe(
        Effect.map(() => 'redeemed' as const),
        Effect.catchTag('EmailProbeUnavailableError', () => Effect.succeed('probe-unavailable' as const)),
        Effect.catchTag('EmailAlreadyRegisteredError', () => Effect.succeed('email-registered' as const)),
        Effect.catch((error) =>
          Effect.sync(() => {
            log.warn('signup failed; leaving signup params for retry', {
              error: HubAccount.accountErrorType(error) ?? String(error),
            });
            return 'failed' as const;
          }),
        ),
      ),
    );
    if (outcome === 'probe-unavailable' || outcome === 'failed') {
      log.warn('could not complete signup; leaving signup params for retry');
      return false;
    }
    if (outcome === 'email-registered') {
      log.info('signup email already registered; awaiting login');
      code && removeQueryParamByValue(code);
      removeQueryParamByValue(email);
      return false;
    }

    code && removeQueryParamByValue(code);
    removeQueryParamByValue(email);
    return true;
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

    await EffectEx.runPromise(
      HubAccount.redeemAccessCode({
        hub: HubAccount.createHubClient(this._hubUrl),
        identity: this._identity,
        email: this._email,
        code: this._accountInvitationCode,
      }).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            log.info('skipped binding existing identity', {
              error: HubAccount.accountErrorType(err) ?? err.message,
            });
          }),
        ),
      ),
    );
    removeQueryParamByValue(this._email);
  }

  private async _showWelcome(): Promise<void> {
    // NOTE: Active parts cannot contain '/' characters currently.
    await this._invokePromise(LayoutOperation.UpdateDialog, {
      subject: WELCOME_SCREEN,
      type: 'alert',
      // Styled here rather than in the welcome screen: this manager runs in every tab to decide
      // whether onboarding is needed, and importing the screen for its styling would put the whole
      // onboarding UI in the resident set.
      overlayClasses: 'dark bg-neutral-950! bg-no-repeat bg-center',
      overlayStyle: { backgroundImage: `url(${hero})` },
    });
  }

  private async _closeWelcome(): Promise<void> {
    await this._invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }

  /** Shown in place of the login form while a `?token=...` magic-link redemption is in flight. */
  private async _showAuthorizingDevice(): Promise<void> {
    await this._invokePromise(LayoutOperation.UpdateDialog, {
      subject: AUTHORIZING_DEVICE_DIALOG,
      type: 'alert',
      overlayClasses: 'dark bg-neutral-950! bg-no-repeat bg-center',
      overlayStyle: { backgroundImage: `url(${hero})` },
    });
  }

  private async _showLoginFailedToast(reason: 'invalid-token' | 'failed'): Promise<void> {
    const id = reason === 'invalid-token' ? 'login-link-expired-toast' : 'login-failed-toast';
    await this._invokePromise(LayoutOperation.AddToast, {
      id,
      title: [`${id}.title`, { ns: meta.profile.key }],
      description: [`${id}.description`, { ns: meta.profile.key }],
      icon: 'ph--warning--regular',
      closeLabel: ['close.label', { ns: osTranslations }],
    });
  }

  private async _createIdentity(): Promise<void> {
    // `invokePromise` resolves with `{ error }` rather than rejecting, so rethrow it — otherwise a
    // failed creation only surfaces later as an invariant defect.
    const { error } = await this._invokePromise(ClientOperation.CreateIdentity, {});
    if (error) {
      throw error;
    }
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

  /** The invitation code stays in the URL so it survives the reset reload. */
  private async _confirmJoinNewIdentity(): Promise<void> {
    await this._invokePromise(ClientOperation.ResetStorage, { mode: 'join-new-identity' });
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
