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

import { supportsNativePasskeys } from '@dxos/app-toolkit';
import { DXOSHorizontalType } from '@dxos/brand';
import { Button, DropdownMenu, Icon, Input, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { hero } from './hero-image';
import { type WelcomeScreenProps, WelcomeState, validEmail, validInvitationCode } from './types';

const supportsPasskeys = (navigator.credentials && 'create' in navigator.credentials) || supportsNativePasskeys();

/** OAuth provider backing the "Atmosphere account" option (atproto / Bluesky). */
const ATMOSPHERE_PROVIDER = 'atproto';

export const OVERLAY_CLASSES = 'dark bg-neutral-950! bg-no-repeat bg-center';
export const OVERLAY_STYLE = { backgroundImage: `url(${hero})` };

// Underline tab style (overrides the react-ui Tabs.Tab button chrome) to match the prior look:
// flat, full-width tabs with a bottom border that highlights the active one.
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
  onSpaceInvitation,
  onGoToLogin,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(meta.profile.key);

  // Default primary login method: prefer passkey when supported, otherwise email.
  const defaultLoginPrimary: LoginMethod = supportsPasskeys && onPasskey ? 'passkey' : 'email';

  // Tab + sub-state. Live in component state since they're transient UI.
  const [tab, setTab] = useState<Tab>('login');
  const [loginPrimary, setLoginPrimary] = useState<LoginMethod>(defaultLoginPrimary);
  const [signupMode, setSignupMode] = useState<SignupMode>('code');
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
  const [codeError, setCodeError] = useState<string | null>(null);

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
    if (!validInvitationCode(code)) {
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

  // Wrap the OAuth flows so `pending` is set for their full duration. The OAuth popup flow is async
  // and `pending` drives `submitDisabled`, so this keeps the Continue button disabled while the
  // popup is open — preventing a second click from opening a duplicate popup (which clobbers the
  // first and trips "OAuth popup closed before completing").
  const handleCreateAccountWithOAuth = useCallback(
    async (args: { code: string; provider: string; loginHint?: string }) => {
      if (pending) {
        return;
      }
      setPending(true);
      try {
        await onCreateAccountWithOAuth?.(args);
      } finally {
        setPending(false);
      }
    },
    [pending, onCreateAccountWithOAuth],
  );

  const handleRecoverWithOAuth = useCallback(
    async (provider: string, loginHint?: string) => {
      if (pending) {
        return;
      }
      setPending(true);
      try {
        await onRecoverWithOAuth?.(provider, loginHint);
      } finally {
        setPending(false);
      }
    },
    [pending, onRecoverWithOAuth],
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
      <div className='z-10 flex flex-col gap-8 p-8 md:px-16'>
        <ComposerLogoMark classNames='text-[80px]' />

        {state === WelcomeState.INIT && (
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
                setSignupMode('code');
              }
            }}
          >
            <Tabs.Viewport classNames='flex flex-col gap-6'>
              <Tabs.Tablist classNames='p-0 gap-1 border-b border-neutral-700'>
                <Tabs.Tab value='login' classNames={tabClassNames}>
                  {t('login-tab.label')}
                </Tabs.Tab>
                <Tabs.Tab value='signup' classNames={tabClassNames}>
                  {t('signup-tab.label')}
                </Tabs.Tab>
              </Tabs.Tablist>

              <Tabs.Panel value='login'>
                <LoginTab
                  identity={identity}
                  primary={loginPrimary}
                  setPrimary={setLoginPrimary}
                  emailValue={email}
                  setEmailValue={setEmail}
                  emailRef={emailRef}
                  emailError={error}
                  pending={pending}
                  onPasskey={onPasskey}
                  onSendSignInLink={handleSendSignInLink}
                  onEmailKeyDown={handleEmailKeyDown}
                  onJoinIdentity={onJoinIdentity}
                  onRecoverIdentity={onRecoverIdentity}
                  onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}
                />
              </Tabs.Panel>

              <Tabs.Panel value='signup'>
                {signupStep === 'collect' && signupMode === 'code' && (
                  <div className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-2'>
                      <h2 className='text-2xl'>{t('signup-code.title')}</h2>
                      <p className='text-description'>{t('signup-code.description')}</p>
                    </div>
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
                      submitDisabled={!validInvitationCode(code) || pending}
                      onSubmit={handleValidateCode}
                      validation={codeError}
                    />
                    <SwapLink onClick={() => setSignupMode('waitlist')}>{t('no-invitation-code-link.label')}</SwapLink>
                  </div>
                )}

                {signupStep === 'collect' && signupMode === 'waitlist' && (
                  <div className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-2'>
                      <h2 className='text-2xl'>{t('waitlist.title')}</h2>
                      <p className='text-description'>{t('waitlist.description')}</p>
                    </div>
                    <InlineForm
                      inputProps={{
                        ref: waitlistEmailRef,
                        placeholder: t('email-input.placeholder'),
                        value: waitlistEmail,
                        onChange: (ev) => setWaitlistEmail(ev.target.value.trim()),
                        onKeyDown: handleWaitlistEmailKeyDown,
                      }}
                      submitLabel={t('waitlist-submit-button.label')}
                      submitDisabled={!validEmail(waitlistEmail) || pending}
                      onSubmit={handleJoinWaitlist}
                    />
                    <SwapLink onClick={() => setSignupMode('code')}>{t('have-invitation-code-link.label')}</SwapLink>
                  </div>
                )}

                {signupStep === 'auth' && (
                  <div className='flex flex-col gap-6'>
                    <div className='flex flex-col gap-2'>
                      <h2 className='text-2xl'>{t('signup-auth.title')}</h2>
                      <p className='text-description'>{t('signup-auth.description')}</p>
                    </div>
                    <InlineForm
                      inputProps={{
                        ref: emailRef,
                        placeholder: t('email-input.placeholder'),
                        value: email,
                        onChange: (ev) => setEmail(ev.target.value.trim()),
                        onKeyDown: handleAuthEmailKeyDown,
                      }}
                      submitLabel={t('continue-button.label')}
                      submitDisabled={!validEmail(email) || pending}
                      onSubmit={handleCreateAccount}
                      validation={error ? t('email-error.message') : null}
                    />
                    {onCreateAccountWithOAuth && (
                      <>
                        <OrDivider>{t('or-divider.label')}</OrDivider>
                        <div className='flex flex-col gap-2'>
                          <p className='text-description'>{t('atmosphere-account-button.label')}</p>
                          <InlineForm
                            inputProps={{
                              placeholder: t('atmosphere-handle-input.placeholder'),
                              value: atmosphereHandle,
                              onChange: (ev) => setAtmosphereHandle(ev.target.value.trim()),
                              onKeyDown: (ev) => {
                                if (ev.key === 'Enter' && atmosphereHandle && !pending) {
                                  void handleCreateAccountWithOAuth({
                                    code,
                                    provider: ATMOSPHERE_PROVIDER,
                                    loginHint: atmosphereHandle,
                                  });
                                }
                              },
                            }}
                            submitLabel={t('continue-button.label')}
                            submitDisabled={!atmosphereHandle || pending}
                            onSubmit={() =>
                              handleCreateAccountWithOAuth({
                                code,
                                provider: ATMOSPHERE_PROVIDER,
                                loginHint: atmosphereHandle,
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                    <SwapLink onClick={() => setSignupStep('collect')}>{t('use-different-code-link.label')}</SwapLink>
                  </div>
                )}
              </Tabs.Panel>
            </Tabs.Viewport>
          </Tabs.Root>
        )}

        {state === WelcomeState.SPACE_INVITATION && (
          <div className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('space-invitation.title')}</h1>
              <p className='text-description'>{t('space-invitation.description')}</p>
            </div>
            <CompoundRow icon='ph--planet--regular' onClick={onSpaceInvitation}>
              {t('join-space-button.label')}
            </CompoundRow>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('go-to-login.title')}</h1>
              <p className='text-description'>{t('go-to-login.description')}</p>
            </div>
            <CompoundRow icon='ph--user--regular' onClick={onGoToLogin}>
              {t('go-to-login-button.label')}
            </CompoundRow>
          </div>
        )}

        {(state === WelcomeState.EMAIL_SENT || state === WelcomeState.LOGIN_SENT) && (
          <div className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('check-email.title')}</h1>
              <p className='text-description'>
                {state === WelcomeState.EMAIL_SENT
                  ? t('request-access-email.description')
                  : t('check-email.description')}
              </p>
            </div>
          </div>
        )}

        {state === WelcomeState.WAITLIST_SUBMITTED && (
          <div className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('waitlist-submitted.title')}</h1>
              <p className='text-description'>{t('waitlist-submitted.description')}</p>
            </div>
          </div>
        )}

        <div className='z-[11] mt-auto flex flex-col'>
          <a href='https://dxos.org' target='_blank' rel='noreferrer'>
            <div className='flex justify-center items-center text-sm gap-1 pr-3 pb-1 opacity-70'>
              <span className='text-description'>Powered by</span>
              <DXOSHorizontalType className='fill-white w-[80px]' />
            </div>
          </a>
        </div>
      </div>
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
  emailError?: boolean;
  pending: boolean;
  onPasskey?: () => unknown;
  onSendSignInLink: () => void;
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
 */
const LoginTab = ({
  identity,
  primary,
  setPrimary,
  emailValue,
  setEmailValue,
  emailRef,
  emailError,
  pending,
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

  type MoreOption = {
    key: string;
    icon: string;
    label: string;
    description: string;
    onClick: () => void;
  };
  const moreOptions: MoreOption[] = [];
  // Passkey as menu item only if it's not currently primary AND it's supported.
  if (primary !== 'passkey' && supportsPasskeys && onPasskey) {
    moreOptions.push({
      key: 'passkey',
      icon: 'ph--key--regular',
      label: t('login-passkey.label'),
      description: t('login-passkey.description'),
      onClick: () => setPrimary('passkey'),
    });
  }
  // Email as menu item only if it's not currently primary.
  if (primary !== 'email') {
    moreOptions.push({
      key: 'email',
      icon: 'ph--envelope-simple--regular',
      label: t('login-email.label'),
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
      icon: 'ph--cloud--regular',
      label: t('login-atmosphere.label'),
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
      description: t('login-device.description'),
      onClick: () => onJoinIdentity(),
    });
  }
  if (onRecoverIdentity) {
    moreOptions.push({
      key: 'recovery',
      icon: 'ph--receipt--regular',
      label: t('login-recovery.label'),
      description: t('login-recovery.description'),
      onClick: () => onRecoverIdentity(),
    });
  }

  return (
    <div className='flex flex-col gap-6'>
      <h2 className='text-2xl'>{identity ? t('existing-identity.title') : t('welcome-back.title')}</h2>
      {/* Primary method */}
      {primary === 'passkey' && supportsPasskeys && onPasskey && (
        <Button variant='primary' classNames='w-full justify-center gap-2' onClick={onPasskey}>
          <Icon icon='ph--key--regular' size={5} />
          <span>{t('sign-in-with-passkey-button.label')}</span>
        </Button>
      )}
      {primary === 'email' && (
        <div className='flex flex-col gap-2'>
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
            validation={emailError ? t('email-error.message') : null}
          />
        </div>
      )}
      {primary === 'atproto' && onRecoverWithOAuth && (
        <div className='flex flex-col gap-2'>
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
            submitLabel={t('continue-button.label')}
            submitDisabled={!atmosphereHandle || pending}
            onSubmit={() => onRecoverWithOAuth(ATMOSPHERE_PROVIDER, atmosphereHandle)}
          />
        </div>
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
                    <Icon icon={opt.icon} size={4} classNames='shrink-0' />
                    <div className='flex flex-col gap-0.5'>
                      <span>{opt.label}</span>
                      <span className='text-xs text-description font-normal'>{opt.description}</span>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
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
  validation,
  onSubmit,
}: {
  inputProps: Omit<ComponentProps<typeof Input.TextInput>, 'classNames'> & {
    classNames?: string;
    ref?: Ref<HTMLInputElement>;
  };
  submitLabel: string;
  submitDisabled?: boolean;
  validation?: ReactNode;
  onSubmit: () => void;
}) => {
  const { classNames: inputClasses, ref, ...rest } = inputProps;
  return (
    <Input.Root>
      <div className='flex flex-col md:gap-1 flex-row gap-0 sm:items-stretch'>
        <Input.TextInput
          {...rest}
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
      {validation && (
        <Input.DescriptionAndValidation>
          <Input.Validation classNames='flex px-2 pt-2 text-error-text'>{validation}</Input.Validation>
        </Input.DescriptionAndValidation>
      )}
    </Input.Root>
  );
};

const CompoundRow = ({ children, icon, onClick }: PropsWithChildren<{ icon: string; onClick?: () => unknown }>) => (
  <button
    type='button'
    className='flex items-center gap-3 px-4 py-3 rounded-md border border-separator hover:bg-neutral-800/50 text-left w-full'
    onClick={onClick}
  >
    <Icon icon={icon} size={5} />
    <span className='flex-1'>{children}</span>
    <Icon icon='ph--caret-right--bold' size={4} />
  </button>
);

/** Horizontal "or" separator between alternative auth methods. */
const OrDivider = ({ children }: PropsWithChildren) => (
  <div className='flex items-center gap-3 text-xs text-description'>
    <div className='flex-1 border-t border-neutral-700' />
    <span className='uppercase tracking-widest'>{children}</span>
    <div className='flex-1 border-t border-neutral-700' />
  </div>
);

export default Welcome;
