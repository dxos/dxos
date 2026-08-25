//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import React, {
  ComponentProps,
  type KeyboardEvent,
  PropsWithChildren,
  type ReactNode,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import * as Account from '@dxos/app-toolkit/Account';
import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import * as NativePasskey from '@dxos/app-toolkit/NativePasskey';
import { DXOSHorizontalType } from '@dxos/brand';
import { log } from '@dxos/log';
import { Button, DropdownMenu, Flex, Icon, Input, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../../meta';
import { OAUTH_RECOVERY_REDIRECT_PATH } from '../../../operations/shared';
import { type WelcomeError, type WelcomeScreenProps, WelcomeState, validEmail } from './types';

const supportsPasskeys =
  (navigator.credentials && 'create' in navigator.credentials) || NativePasskey.supportsNativePasskeys();

/** Ceiling on the OAuth wait, since a user who closes the provider's page reports nothing. */
const OAUTH_PENDING_TIMEOUT = 5 * 60 * 1000;

/** OAuth provider backing the "Atmosphere account" option (atproto / Bluesky). */
const ATMOSPHERE_PROVIDER = 'atproto';

const errorMessageKeys: Record<WelcomeError, string> = {
  'email': 'email-error.message',
  'account-exists': 'account-exists-error.message',
  'email-check-unavailable': 'email-check-unavailable-error.message',
  'oauth': 'oauth-error.message',
  'passkey-dismissed': 'passkey-dismissed-error.message',
  'passkey-rejected': 'passkey-rejected-error.message',
  'passkey-failed': 'passkey-failed-error.message',
};

/**
 * Variants used when a passkey is the only permitted login method: the default messages send the user
 * to email or another device, which aren't on offer there.
 */
const passkeyOnlyErrorMessageKeys: Partial<Record<WelcomeError, string>> = {
  'passkey-rejected': 'passkey-rejected-passkey-only-error.message',
  'passkey-failed': 'passkey-failed-passkey-only-error.message',
};

/** Message for a passkey failure; drops the "try another method" advice when there is no other method. */
const passkeyErrorKey = (error: WelcomeError, passkeyOnly: boolean): string =>
  (passkeyOnly ? passkeyOnlyErrorMessageKeys[error] : undefined) ?? errorMessageKeys[error];

// Flat, full-width tabs with a bottom border that highlights the active one.
const tabClassNames =
  'flex-1 rounded-none shadow-none bg-transparent hover:bg-transparent px-4 py-2 text-sm font-normal -mb-px ' +
  'border-b-2 border-transparent text-description transition-colors hover:text-white ' +
  'data-[state=active]:border-white data-[state=active]:text-white';

const ComposerLogoMark = ({ classNames }: ThemedClassName) => (
  <span className={mx('font-["Poiret One"]', classNames)} style={{ fontFamily: 'Poiret One' }}>
    composer
  </span>
);

type Tab = 'login' | 'signup';
type LoginMethod = 'passkey' | 'email' | 'atproto';
type SignupMode = 'code' | 'waitlist';
type SignupStep = 'collect' | 'auth';

export const Welcome = ({
  state,
  error,
  identity,
  onEmailLogin,
  onPasskey,
  onJoinIdentity,
  onRecoverIdentity,
  onRecoverWithOAuth,
  onValidateInvitationCode,
  onCreateAccount,
  onCreateAccountWithOAuth,
  onJoinWaitlist,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(meta.profile.key);

  // Default primary login method: prefer passkey when supported, then email, then the Atmosphere form.
  const defaultLoginPrimary: LoginMethod =
    supportsPasskeys && onPasskey ? 'passkey' : onEmailLogin ? 'email' : 'atproto';

  // A sign-up mode is offered only when its handlers can complete it: a code needs both a validator
  // and a creation path, and the screen supplies the waitlist alone once an identity exists. With
  // neither (the iOS app) the screen collapses to the login form with no tablist.
  const codeSignupEnabled = !!onValidateInvitationCode && (!!onCreateAccount || !!onCreateAccountWithOAuth);
  const waitlistEnabled = !!onJoinWaitlist;
  const signupEnabled = codeSignupEnabled || waitlistEnabled;
  const defaultSignupMode: SignupMode = codeSignupEnabled ? 'code' : 'waitlist';

  // Tab + sub-state. Live in component state since they're transient UI.
  const [tab, setTab] = useState<Tab>('login');
  const [loginPrimary, setLoginPrimary] = useState<LoginMethod>(defaultLoginPrimary);
  const [signupMode, setSignupMode] = useState<SignupMode>(defaultSignupMode);
  const [signupStep, setSignupStep] = useState<SignupStep>('collect');

  // Inputs.
  const rootRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const waitlistEmailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  // atproto handle (e.g. `you.bsky.social`) forwarded to the OAuth flow as a login hint.
  const [atmosphereHandle, setAtmosphereHandle] = useState('');
  const [pending, setPending] = useState(false);
  // Separate from `pending`, whose call resolves as soon as the provider's page opens — this stays
  // set for the part the user actually waits on.
  const [oauthPending, setOauthPending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  // OAuth leaves the app, so without this the other methods stay live and a competing attempt can
  // start against a flow already in progress.
  const formPending = pending || oauthPending;

  // Nothing reports success: the flow completes by navigating this screen away.
  useEffect(() => {
    if (error) {
      setOauthPending(false);
    }
  }, [error]);

  useEffect(() => {
    if (!oauthPending) {
      return;
    }
    const timeout = setTimeout(() => setOauthPending(false), OAUTH_PENDING_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [oauthPending]);

  // On desktop the wait ends when the callback lands, whatever it says: finalizing navigates this
  // screen away, and a failure is reported only as a toast, which would otherwise leave the form
  // locked until the ceiling above. The browser path reloads instead, so it never gets here.
  useEffect(() => {
    if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {
      return;
    }
    let unlisten: (() => void) | undefined;
    let stopped = false;
    void NativeOAuth.listenForNativeOAuthCallback(OAUTH_RECOVERY_REDIRECT_PATH, () => setOauthPending(false)).then(
      (fn) => {
        unlisten = fn;
        if (stopped) {
          fn();
        }
      },
      (error) => log.warn('failed to listen for OAuth callback', { error }),
    );
    return () => {
      stopped = true;
      unlisten?.();
    };
  }, [oauthPending]);

  const focusPrimaryField = useCallback(() => {
    if (state !== WelcomeState.INIT) {
      return;
    }

    if (tab === 'login' && loginPrimary === 'email') {
      emailRef.current?.focus();
    } else if (tab === 'signup') {
      if (signupStep === 'collect' && signupMode === 'code') {
        codeRef.current?.focus();
      } else if (signupStep === 'collect' && signupMode === 'waitlist') {
        waitlistEmailRef.current?.focus();
      } else if (signupStep === 'auth') {
        emailRef.current?.focus();
      }
    }
  }, [state, tab, loginPrimary, signupStep, signupMode]);

  useEffect(() => {
    focusPrimaryField();
  }, [focusPrimaryField]);

  //
  // Login handlers
  //

  // Holds `pending` for the whole WebAuthn ceremony so a second click can't open a duplicate prompt.
  const handlePasskey = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await onPasskey?.();
    } finally {
      setPending(false);
    }
  }, [pending, onPasskey]);

  const handleSendSignInLink = useCallback(async () => {
    if (!validEmail(email)) {
      emailRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      await onEmailLogin?.(email);
    } finally {
      setPending(false);
    }
  }, [email, onEmailLogin]);

  const handleEmailKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleSendSignInLink();
      }
    },
    [handleSendSignInLink],
  );

  //
  // Signup handlers
  //

  const handleValidateCode = useCallback(async () => {
    if (!Account.isValidAccessCodeFormat(code)) {
      setCodeError(t('invitation-code-format-error.message'));
      codeRef.current?.focus();
      return;
    }
    setCodeError(null);
    setPending(true);
    try {
      const ok = (await onValidateInvitationCode?.(code)) ?? false;
      if (!ok) {
        setCodeError(t('invitation-code-invalid-error.message'));
        codeRef.current?.focus();
        return;
      }
      setSignupStep('auth');
    } finally {
      setPending(false);
    }
  }, [code, onValidateInvitationCode, t]);

  const handleCreateAccount = useCallback(async () => {
    if (!validEmail(email)) {
      emailRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      await onCreateAccount?.({ code, email });
    } finally {
      setPending(false);
    }
  }, [code, email, onCreateAccount]);

  // Signup-specific failures report under the signup email field rather than as a
  // generic delivery error.
  const signupEmailError =
    error === 'email' || error === 'account-exists' || error === 'email-check-unavailable'
      ? t(errorMessageKeys[error])
      : null;

  const handleSwitchToEmailLogin = useCallback(() => {
    setTab('login');
    setLoginPrimary('email');
  }, []);

  const handleJoinWaitlist = useCallback(async () => {
    if (!validEmail(waitlistEmail)) {
      return;
    }
    setPending(true);
    try {
      await onJoinWaitlist?.(waitlistEmail);
    } finally {
      setPending(false);
    }
  }, [waitlistEmail, onJoinWaitlist]);

  // Held past the call's own resolution, which lands when the provider's page opens rather than
  // when the user is done with it.
  const handleCreateAccountWithOAuth = useCallback(
    async (args: { code: string; provider: string; loginHint?: string }) => {
      if (formPending) {
        return;
      }
      setOauthPending(true);
      await onCreateAccountWithOAuth?.(args);
    },
    [formPending, onCreateAccountWithOAuth],
  );

  const handleRecoverWithOAuth = useCallback(
    async (provider: string, loginHint?: string) => {
      if (formPending) {
        return;
      }
      setOauthPending(true);
      await onRecoverWithOAuth?.(provider, loginHint);
    },
    [formPending, onRecoverWithOAuth],
  );

  const handleCodeKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleValidateCode();
      }
    },
    [handleValidateCode],
  );

  const handleAuthEmailKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleCreateAccount();
      }
    },
    [handleCreateAccount],
  );

  const handleWaitlistEmailKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        void handleJoinWaitlist();
      }
    },
    [handleJoinWaitlist],
  );

  //
  // Render
  //

  // Shared by both layouts: the login form renders inside the tablist when sign-up is available and
  // on its own when it isn't.
  const loginTab = (
    <LoginTab
      identity={identity}
      primary={loginPrimary}
      setPrimary={setLoginPrimary}
      emailValue={email}
      setEmailValue={setEmail}
      emailRef={emailRef}
      error={error}
      pending={formPending}
      oauthPending={oauthPending}
      onPasskey={onPasskey ? handlePasskey : undefined}
      onSendSignInLink={onEmailLogin ? handleSendSignInLink : undefined}
      onEmailKeyDown={handleEmailKeyDown}
      onJoinIdentity={onJoinIdentity}
      onRecoverIdentity={onRecoverIdentity}
      onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}
    />
  );

  return (
    <div
      ref={rootRef}
      className={mx(
        'relative grid grid-cols-1 md:w-[37rem] max-w-[37rem] h-full md:h-[675px] overflow-hidden',
        'border-2 border-sky-950 rounded-xl lg:translate-x-[-40%]',
      )}
      style={{
        backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff80, var(--color-neutral-950))',
      }}
    >
      <Flex column gap='2xl' classNames='z-10 p-8 md:px-16'>
        <ComposerLogoMark classNames='text-[80px]' />

        {state === WelcomeState.INIT && !signupEnabled && loginTab}

        {state === WelcomeState.INIT && signupEnabled && (
          <Tabs.Root
            asChild
            orientation='horizontal'
            defaultActivePart='panel'
            suppressRegionFocus
            value={tab}
            onValueChange={(value) => {
              const next = value as Tab;
              setTab(next);
              if (next === 'signup') {
                setSignupStep('collect');
                setSignupMode(defaultSignupMode);
              }
            }}
          >
            <Tabs.Viewport classNames='flex flex-col gap-6'>
              <Tabs.Tablist classNames='p-0 gap-1 border-b border-neutral-700'>
                <Tabs.Button value='login' classNames={tabClassNames}>
                  {t('login-tab.label')}
                </Tabs.Button>
                <Tabs.Button value='signup' classNames={tabClassNames}>
                  {t('signup-tab.label')}
                </Tabs.Button>
              </Tabs.Tablist>

              <Tabs.Panel value='login'>{loginTab}</Tabs.Panel>

              <Tabs.Panel value='signup'>
                {signupStep === 'collect' && signupMode === 'code' && codeSignupEnabled && (
                  <Flex column gap='xl'>
                    <Flex column gap='sm'>
                      <h2 className='text-2xl'>{t('signup-code.title')}</h2>
                      <p className='text-description'>{t('signup-code.description')}</p>
                    </Flex>
                    <InlineForm
                      inputProps={{
                        ref: codeRef,
                        classNames: 'font-mono uppercase tracking-widest',
                        placeholder: 'XXXX-XXXX',
                        value: code,
                        onChange: (ev) => setCode(ev.target.value.trim()),
                        onKeyDown: handleCodeKeyDown,
                      }}
                      submitLabel={t('continue-button.label')}
                      submitDisabled={!Account.isValidAccessCodeFormat(code) || formPending}
                      onSubmit={handleValidateCode}
                      validation={codeError}
                    />
                    {waitlistEnabled && (
                      <SwapLink onClick={() => setSignupMode('waitlist')}>
                        {t('no-invitation-code-link.label')}
                      </SwapLink>
                    )}
                  </Flex>
                )}

                {signupStep === 'collect' && signupMode === 'waitlist' && waitlistEnabled && (
                  <Flex column gap='xl'>
                    <Flex column gap='sm'>
                      <h2 className='text-2xl'>{t('waitlist.title')}</h2>
                      <p className='text-description'>{t('waitlist.description')}</p>
                    </Flex>
                    <InlineForm
                      inputProps={{
                        ref: waitlistEmailRef,
                        placeholder: t('email-input.placeholder'),
                        value: waitlistEmail,
                        onChange: (ev) => setWaitlistEmail(ev.target.value.trim()),
                        onKeyDown: handleWaitlistEmailKeyDown,
                      }}
                      submitLabel={t('waitlist-submit-button.label')}
                      submitDisabled={!validEmail(waitlistEmail) || formPending}
                      onSubmit={handleJoinWaitlist}
                    />
                    {codeSignupEnabled && (
                      <SwapLink onClick={() => setSignupMode('code')}>{t('have-invitation-code-link.label')}</SwapLink>
                    )}
                  </Flex>
                )}

                {signupStep === 'auth' && (
                  <Flex column gap='xl'>
                    <Flex column gap='sm'>
                      <h2 className='text-2xl'>{t('signup-auth.title')}</h2>
                      <p className='text-description'>{t('signup-auth.description')}</p>
                    </Flex>
                    {onCreateAccount && (
                      <>
                        <InlineForm
                          inputProps={{
                            ref: emailRef,
                            placeholder: t('email-input.placeholder'),
                            value: email,
                            onChange: (ev) => setEmail(ev.target.value.trim()),
                            onKeyDown: handleAuthEmailKeyDown,
                          }}
                          submitLabel={t('continue-button.label')}
                          submitDisabled={!validEmail(email) || formPending}
                          onSubmit={handleCreateAccount}
                          validation={signupEmailError}
                        />
                        {error === 'account-exists' && (
                          <SwapLink onClick={handleSwitchToEmailLogin}>{t('log-in-instead-link.label')}</SwapLink>
                        )}
                      </>
                    )}
                    {onCreateAccountWithOAuth && (
                      <>
                        {onCreateAccount && <OrDivider>{t('or-divider.label')}</OrDivider>}
                        <Flex column gap='sm'>
                          <p className='text-description'>{t('atmosphere-account-button.label')}</p>
                          <InlineForm
                            inputProps={{
                              placeholder: t('atmosphere-handle-input.placeholder'),
                              value: atmosphereHandle,
                              onChange: (ev) => setAtmosphereHandle(ev.target.value.trim()),
                              onKeyDown: (ev) => {
                                if (ev.key === 'Enter' && atmosphereHandle && !formPending) {
                                  void handleCreateAccountWithOAuth({
                                    code,
                                    provider: ATMOSPHERE_PROVIDER,
                                    loginHint: atmosphereHandle,
                                  });
                                }
                              },
                            }}
                            submitLabel={oauthPending ? t('oauth-pending.label') : t('continue-button.label')}
                            submitDisabled={!atmosphereHandle || pending}
                            pending={oauthPending}
                            onSubmit={() =>
                              handleCreateAccountWithOAuth({
                                code,
                                provider: ATMOSPHERE_PROVIDER,
                                loginHint: atmosphereHandle,
                              })
                            }
                            validation={error === 'oauth' ? t(errorMessageKeys.oauth) : null}
                          />
                        </Flex>
                      </>
                    )}
                    <SwapLink onClick={() => setSignupStep('collect')}>{t('use-different-code-link.label')}</SwapLink>
                  </Flex>
                )}
              </Tabs.Panel>
            </Tabs.Viewport>
          </Tabs.Root>
        )}

        {(state === WelcomeState.EMAIL_SENT || state === WelcomeState.LOGIN_SENT) && (
          <Flex column gap='2xl'>
            <Flex column gap='sm'>
              <h1 className='text-2xl'>{t('check-email.title')}</h1>
              <p className='text-description'>
                {state === WelcomeState.EMAIL_SENT
                  ? t('request-access-email.description')
                  : t('check-email.description')}
              </p>
            </Flex>
          </Flex>
        )}

        {state === WelcomeState.WAITLIST_SUBMITTED && (
          <Flex column gap='2xl'>
            <Flex column gap='sm'>
              <h1 className='text-2xl'>{t('waitlist-submitted.title')}</h1>
              <p className='text-description'>{t('waitlist-submitted.description')}</p>
            </Flex>
          </Flex>
        )}

        <Flex column classNames='z-[11] mt-auto'>
          <a href='https://dxos.org' target='_blank' rel='noreferrer'>
            <Flex gap='xs' center classNames='text-sm pr-3 pb-1 opacity-70'>
              <span className='text-description'>Powered by</span>
              <DXOSHorizontalType className='fill-white w-[80px]' />
            </Flex>
          </a>
        </Flex>
      </Flex>
    </div>
  );
};

//
// Sub-components
//

/**
 * Small "swap" link used at the bottom of forms to switch between alternative
 * modes within the same view (e.g. invitation code <-> waitlist). Replaces the
 * older nested back-button pattern.
 */
const SwapLink = ({ onClick, children }: PropsWithChildren<{ onClick: () => void }>) => (
  <button
    type='button'
    onClick={onClick}
    className='self-center text-xs text-description hover:text-white underline underline-offset-4'
  >
    {children}
  </button>
);

type LoginTabProps = {
  identity?: ReturnType<typeof Object> | null;
  primary: LoginMethod;
  setPrimary: (method: LoginMethod) => void;
  emailValue: string;
  setEmailValue: (value: string) => void;
  emailRef: React.Ref<HTMLInputElement>;
  error?: WelcomeError | null;
  pending: boolean;
  /** An OAuth flow is waiting on the provider page, which the user completes outside this window. */
  oauthPending: boolean;
  onPasskey?: () => unknown;
  onSendSignInLink?: () => void;
  onEmailKeyDown: (ev: KeyboardEvent<HTMLInputElement>) => void;
  onJoinIdentity?: () => unknown;
  onRecoverIdentity?: () => unknown;
  onRecoverWithOAuth?: (provider: string, loginHint?: string) => unknown;
};

/**
 * Login tab. The "primary" auth method (passkey or email) renders at the top;
 * other options live under "More ways to log in":
 *
 * - Picking the *other* primary method (passkey ↔ email ↔ atmosphere) swaps it to primary.
 * - Picking `From another device` or `Recovery code` invokes their handler
 *   directly (those open dedicated dialogs and don't need a primary form).
 *
 * A method is offered only when its handler is supplied, so a caller can narrow the tab to a single
 * method (the iOS app permits passkeys alone).
 */
const LoginTab = ({
  identity,
  primary,
  setPrimary,
  emailValue,
  setEmailValue,
  emailRef,
  error,
  pending,
  oauthPending,
  onPasskey,
  onSendSignInLink,
  onEmailKeyDown,
  onJoinIdentity,
  onRecoverIdentity,
  onRecoverWithOAuth,
}: LoginTabProps) => {
  const { t } = useTranslation(meta.profile.key);
  const atmosphereRef = useRef<HTMLInputElement>(null);
  const [atmosphereHandle, setAtmosphereHandle] = useState('');
  const pendingPrimaryFocus = useRef<LoginMethod | null>(null);

  const focusEmailRef = useCallback(() => {
    if (emailRef && typeof emailRef === 'object') {
      emailRef.current?.focus();
    }
  }, [emailRef]);

  const focusAtmosphereRef = useCallback(() => {
    atmosphereRef.current?.focus();
  }, []);

  const handleMoreMenuCloseAutoFocus = useCallback(() => {
    setTimeout(() => {
      const pending = pendingPrimaryFocus.current;
      pendingPrimaryFocus.current = null;
      if (pending === 'email') {
        focusEmailRef();
      } else if (pending === 'atproto') {
        focusAtmosphereRef();
      }
    }, 0);
  }, [focusAtmosphereRef, focusEmailRef]);

  // Which methods this caller permits; also decides whether the primary form can render at all.
  const methodAvailable: Record<LoginMethod, boolean> = {
    passkey: supportsPasskeys && !!onPasskey,
    email: !!onSendSignInLink,
    atproto: !!onRecoverWithOAuth,
  };

  type MoreOption = {
    key: string;
    icon: string;
    label: string;
    classNames?: string;
    description: string;
    onClick: () => void;
  };
  const moreOptions: MoreOption[] = [];
  // Passkey as menu item only if it's not currently primary AND it's supported.
  if (primary !== 'passkey' && methodAvailable.passkey && onPasskey) {
    moreOptions.push({
      key: 'passkey',
      icon: 'ph--key--regular',
      label: t('login-passkey.label'),
      classNames: 'text-pink-500',
      description: t('login-passkey.description'),
      onClick: () => setPrimary('passkey'),
    });
  }
  // Email as menu item only if it's not currently primary AND it's permitted.
  if (primary !== 'email' && methodAvailable.email) {
    moreOptions.push({
      key: 'email',
      icon: 'ph--envelope-simple--regular',
      label: t('login-email.label'),
      classNames: 'text-rose-500',
      description: t('login-email.description'),
      onClick: () => {
        pendingPrimaryFocus.current = 'email';
        setPrimary('email');
      },
    });
  }
  // Atmosphere: swaps to primary like email/passkey do so only one form is shown at a time.
  if (primary !== 'atproto' && onRecoverWithOAuth) {
    moreOptions.push({
      key: 'atproto',
      icon: 'ph--butterfly--regular',
      label: t('login-atmosphere.label'),
      classNames: 'text-blue-500',
      description: t('login-atmosphere.description'),
      onClick: () => {
        pendingPrimaryFocus.current = 'atproto';
        setPrimary('atproto');
      },
    });
  }
  // Device + recovery: always direct-invoke (open their own dialogs) rather than
  // swapping to primary like passkey/email/atmosphere.
  // TODO(wittjosiah): Integrate the device-invitation and recovery-code flows into
  //   this Welcome layout (so they render as primary forms here instead of opening
  //   separate dialogs). Their UI is some of the oldest in Composer and should be
  //   modernized to match the rest of the auth surface.
  if (onJoinIdentity) {
    moreOptions.push({
      key: 'device',
      icon: 'ph--qr-code--regular',
      label: t('login-device.label'),
      classNames: 'text-neutral-500',
      description: t('login-device.description'),
      onClick: () => onJoinIdentity(),
    });
  }
  if (onRecoverIdentity) {
    moreOptions.push({
      key: 'recovery',
      icon: 'ph--receipt--regular',
      classNames: 'text-green-500',
      label: t('login-recovery.label'),
      description: t('login-recovery.description'),
      onClick: () => onRecoverIdentity(),
    });
  }

  return (
    <Flex column gap='xl'>
      <h2 className='text-2xl'>{identity ? t('existing-identity.title') : t('welcome-back.title')}</h2>
      {/* Primary method */}
      {primary === 'passkey' && methodAvailable.passkey && onPasskey && (
        <Flex column gap='sm'>
          <Button
            variant='primary'
            classNames='w-full justify-center gap-2 disabled:bg-neutral-800'
            disabled={pending}
            onClick={onPasskey}
          >
            <Icon icon='ph--key--regular' size={5} />
            <span>{pending ? t('passkey-pending.label') : t('sign-in-with-passkey-button.label')}</span>
          </Button>
          {error?.startsWith('passkey-') && (
            <Input.Root>
              <ValidationMessage>{t(passkeyErrorKey(error, moreOptions.length === 0))}</ValidationMessage>
            </Input.Root>
          )}
        </Flex>
      )}
      {primary === 'email' && onSendSignInLink && (
        <Flex column gap='sm'>
          <p className='text-sm text-description'>{t('login-email.description')}</p>
          <InlineForm
            inputProps={{
              ref: emailRef,
              placeholder: t('email-input.placeholder'),
              value: emailValue,
              onChange: (ev) => setEmailValue(ev.target.value.trim()),
              onKeyDown: onEmailKeyDown,
            }}
            submitLabel={t('send-link-button.label')}
            submitDisabled={!validEmail(emailValue) || pending}
            onSubmit={onSendSignInLink}
            validation={error === 'email' ? t(errorMessageKeys.email) : null}
          />
        </Flex>
      )}
      {primary === 'atproto' && onRecoverWithOAuth && (
        <Flex column gap='sm'>
          <p className='text-sm text-description'>{t('login-atmosphere.description')}</p>
          <InlineForm
            inputProps={{
              ref: atmosphereRef,
              placeholder: t('atmosphere-handle-input.placeholder'),
              value: atmosphereHandle,
              onChange: (ev) => setAtmosphereHandle(ev.target.value.trim()),
              onKeyDown: (ev) => {
                if (ev.key === 'Enter' && atmosphereHandle && !pending) {
                  void onRecoverWithOAuth(ATMOSPHERE_PROVIDER, atmosphereHandle);
                }
              },
            }}
            submitLabel={oauthPending ? t('oauth-pending.label') : t('continue-button.label')}
            submitDisabled={!atmosphereHandle || pending}
            pending={oauthPending}
            onSubmit={() => onRecoverWithOAuth(ATMOSPHERE_PROVIDER, atmosphereHandle)}
            validation={error === 'oauth' ? t(errorMessageKeys.oauth) : null}
          />
        </Flex>
      )}
      {!methodAvailable[primary] && moreOptions.length === 0 && (
        <Input.Root>
          <ValidationMessage>{t('login-unavailable.message')}</ValidationMessage>
        </Input.Root>
      )}
      {moreOptions.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type='button'
              className='flex items-center justify-center gap-1 text-sm text-description hover:text-white underline underline-offset-4 outline-none'
            >
              <span>{t('more-ways-to-sign-in.label')}</span>
              <Icon icon='ph--caret-down--regular' size={4} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            {/* Raise above the dialog overlay (z-40): radix copies the content's computed z-index
                onto the popper wrapper, and the default menu z-20 renders behind the overlay. */}
            <DropdownMenu.Content
              side='bottom'
              sideOffset={8}
              collisionPadding={16}
              classNames='!w-80 !z-50'
              onCloseAutoFocus={handleMoreMenuCloseAutoFocus}
            >
              <DropdownMenu.Viewport>
                {moreOptions.map((opt) => (
                  <DropdownMenu.Item key={opt.key} onSelect={opt.onClick} classNames='gap-3'>
                    <Icon icon={opt.icon} size={6} classNames={mx('shrink-0', opt.classNames)} />
                    <Flex column gap='xs'>
                      <span>{opt.label}</span>
                      <span className='text-xs text-description font-normal'>{opt.description}</span>
                    </Flex>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </Flex>
  );
};

/**
 * Joined input + submit button. Vertical stack on narrow screens, joined row on
 * `sm` and up (input takes flex-1 with right corners squared, button shrinks to
 * its label with left corners squared). The validation slot only renders when
 * there's a message, so the form has no phantom whitespace below it -- the form
 * will shift slightly when an error first appears, which is preferable to
 * permanent extra padding.
 */
const InlineForm = ({
  inputProps,
  submitLabel,
  submitDisabled,
  pending,
  validation,
  onSubmit,
}: {
  inputProps: Omit<ComponentProps<typeof Input.TextInput>, 'classNames'> & {
    classNames?: string;
    ref?: Ref<HTMLInputElement>;
  };
  submitLabel: string;
  submitDisabled?: boolean;
  /** Waiting on a step the user takes elsewhere; the field is locked so its value still describes it. */
  pending?: boolean;
  validation?: ReactNode;
  onSubmit: () => void;
}) => {
  const { classNames: inputClasses, ref, ...rest } = inputProps;
  return (
    <Input.Root>
      <div className='flex flex-col md:gap-1 flex-row gap-0 sm:items-stretch'>
        <Input.TextInput
          {...rest}
          disabled={pending || rest.disabled}
          classNames={mx('bg-deck-surface flex-1 sm:rounded-r-none', inputClasses)}
          ref={ref}
        />
        <Button
          variant='primary'
          classNames='disabled:bg-neutral-800 sm:rounded-l-none'
          disabled={submitDisabled}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </div>
      {validation && <ValidationMessage>{validation}</ValidationMessage>}
    </Input.Root>
  );
};

/**
 * Error text under a login control. Shared with {@link InlineForm} so a failure reads the same
 * whether it came from a field (email, invitation code) or a button (passkey). Callers outside
 * `InlineForm` must supply their own `Input.Root` — it is context only and renders no markup.
 */
const ValidationMessage = ({ children }: PropsWithChildren) => (
  <Input.DescriptionAndValidation>
    <Input.Validation classNames='flex px-2 pt-2 text-error-text'>{children}</Input.Validation>
  </Input.DescriptionAndValidation>
);

/** Horizontal "or" separator between alternative auth methods. */
const OrDivider = ({ children }: PropsWithChildren) => (
  <Flex gap='md' align='center' classNames='text-xs text-description'>
    <div className='flex-1 border-t border-neutral-700' />
    <span className='uppercase tracking-widest'>{children}</span>
    <div className='flex-1 border-t border-neutral-700' />
  </Flex>
);

export default Welcome;
