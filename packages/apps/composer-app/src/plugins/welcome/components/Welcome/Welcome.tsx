//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import React, {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import { supportsNativePasskeys } from '@dxos/app-toolkit';
import { DXOSHorizontalType } from '@dxos/brand';
import { Button, Icon, Input, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { hero } from './hero-image';
import { type WelcomeScreenProps, WelcomeState, validEmail, validInvitationCode } from './types';

const supportsPasskeys = (navigator.credentials && 'create' in navigator.credentials) || supportsNativePasskeys();

export const OVERLAY_CLASSES = 'dark bg-neutral-950! bg-no-repeat bg-center';
export const OVERLAY_STYLE = { backgroundImage: `url(${hero})` };

type Tab = 'login' | 'signup';
type LoginMethod = 'passkey' | 'email';
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
  onValidateInvitationCode,
  onCreateAccount,
  onJoinWaitlist,
  onSpaceInvitation,
  onGoToLogin,
}: WelcomeScreenProps) => {
  const { t } = useTranslation(meta.id);

  // Default primary login method: prefer passkey when supported, otherwise email.
  const defaultLoginPrimary: LoginMethod = supportsPasskeys && onPasskey ? 'passkey' : 'email';

  // Tab + sub-state. Live in component state since they're transient UI.
  const [tab, setTab] = useState<Tab>('login');
  const [loginPrimary, setLoginPrimary] = useState<LoginMethod>(defaultLoginPrimary);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signupMode, setSignupMode] = useState<SignupMode>('code');
  const [signupStep, setSignupStep] = useState<SignupStep>('collect');

  // Inputs.
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

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
      setCodeError(t('invitation-code-format-error'));
      codeRef.current?.focus();
      return;
    }
    setCodeError(null);
    setPending(true);
    try {
      const ok = (await onValidateInvitationCode?.(code)) ?? false;
      if (!ok) {
        setCodeError(t('invitation-code-invalid-error'));
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
      className={mx(
        'relative grid grid-cols-1 md:w-[40rem] max-w-[40rem] h-full md:h-[675px] overflow-hidden',
        'rounded-xl shadow-md lg:translate-x-[-40%]',
      )}
      style={{
        backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff80, var(--color-neutral-950))',
      }}
    >
      <div className='z-10 flex flex-col gap-8 p-8 md:px-16'>
        <h1 className="font-['Poiret One'] text-[80px]" style={{ fontFamily: 'Poiret One' }}>
          composer
        </h1>

        {state === WelcomeState.INIT && (
          <div role='none' className='flex flex-col gap-6'>
            {/* Tabs */}
            <div className='flex gap-1 border-b border-neutral-700'>
              <TabButton active={tab === 'login'} onClick={() => setTab('login')}>
                {t('login-tab.label')}
              </TabButton>
              <TabButton
                active={tab === 'signup'}
                onClick={() => {
                  setTab('signup');
                  setSignupStep('collect');
                  setSignupMode('code');
                }}
              >
                {t('signup-tab.label')}
              </TabButton>
            </div>

            {tab === 'login' && (
              <LoginTab
                t={t}
                identity={identity}
                primary={loginPrimary}
                setPrimary={(method) => {
                  setLoginPrimary(method);
                  setMoreOpen(false);
                }}
                moreOpen={moreOpen}
                setMoreOpen={setMoreOpen}
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
              />
            )}

            {tab === 'signup' && signupStep === 'collect' && signupMode === 'code' && (
              <div role='none' className='flex flex-col gap-6'>
                <div className='flex flex-col gap-2'>
                  <h2 className='text-2xl'>{t('signup-code.title')}</h2>
                  <p className='text-description'>{t('signup-code.description')}</p>
                </div>
                <InlineForm
                  inputProps={{
                    autoFocus: true,
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
                <SwapLink onClick={() => setSignupMode('waitlist')}>
                  {t('no-invitation-code-link')}
                </SwapLink>
              </div>
            )}

            {tab === 'signup' && signupStep === 'collect' && signupMode === 'waitlist' && (
              <div role='none' className='flex flex-col gap-6'>
                <div className='flex flex-col gap-2'>
                  <h2 className='text-2xl'>{t('waitlist.title')}</h2>
                  <p className='text-description'>{t('waitlist.description')}</p>
                </div>
                <InlineForm
                  inputProps={{
                    autoFocus: true,
                    placeholder: t('email-input.placeholder'),
                    value: waitlistEmail,
                    onChange: (ev) => setWaitlistEmail(ev.target.value.trim()),
                    onKeyDown: handleWaitlistEmailKeyDown,
                  }}
                  submitLabel={t('waitlist-submit-button.label')}
                  submitDisabled={!validEmail(waitlistEmail) || pending}
                  onSubmit={handleJoinWaitlist}
                />
                <SwapLink onClick={() => setSignupMode('code')}>
                  {t('have-invitation-code-link')}
                </SwapLink>
              </div>
            )}

            {tab === 'signup' && signupStep === 'auth' && (
              <div role='none' className='flex flex-col gap-6'>
                <div className='flex flex-col gap-2'>
                  <h2 className='text-2xl'>{t('signup-auth.title')}</h2>
                  <p className='text-description'>{t('signup-auth.description')}</p>
                </div>
                <InlineForm
                  inputProps={{
                    autoFocus: true,
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
                <SwapLink onClick={() => setSignupStep('collect')}>
                  {t('use-different-code-link')}
                </SwapLink>
              </div>
            )}
          </div>
        )}

        {state === WelcomeState.SPACE_INVITATION && (
          <div role='none' className='flex flex-col gap-8'>
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
          <div role='none' className='flex flex-col gap-8'>
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
          <div role='none' className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl'>{t('waitlist-submitted.title')}</h1>
              <p className='text-description'>{t('waitlist-submitted.description')}</p>
            </div>
          </div>
        )}

        <div className='z-[11] flex flex-col h-full justify-end'>
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

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type='button'
    onClick={onClick}
    className={mx(
      'flex-1 px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
      active ? 'border-white text-white' : 'border-transparent text-description hover:text-white',
    )}
  >
    {children}
  </button>
);

/**
 * Small "swap" link used at the bottom of forms to switch between alternative
 * modes within the same view (e.g. invitation code <-> waitlist). Replaces the
 * older nested back-button pattern.
 */
const SwapLink = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    type='button'
    onClick={onClick}
    className='self-center text-xs text-description hover:text-white underline underline-offset-4'
  >
    {children}
  </button>
);

type LoginTabProps = {
  t: (key: string) => string;
  identity?: ReturnType<typeof Object> | null;
  primary: LoginMethod;
  setPrimary: (method: LoginMethod) => void;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
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
};

/**
 * Login tab. The "primary" auth method (passkey or email) renders at the top;
 * other options live under "More ways to log in":
 *
 * - Picking the *other* primary method (passkey ↔ email) swaps it to primary.
 * - Picking `From another device` or `Recovery code` invokes their handler
 *   directly (those open dedicated dialogs and don't need a primary form).
 */
const LoginTab = ({
  t,
  identity,
  primary,
  setPrimary,
  moreOpen,
  setMoreOpen,
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
}: LoginTabProps) => {
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
      onClick: () => setPrimary('email'),
    });
  }
  // Device + recovery: always direct-invoke (open their own dialogs) rather than
  // swapping to primary like passkey/email.
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
    <div role='none' className='flex flex-col gap-6'>
      <h2 className='text-2xl'>{identity ? t('existing-identity.title') : t('welcome-back.title')}</h2>

      {/* Primary method */}
      {primary === 'passkey' && supportsPasskeys && onPasskey && (
        <Button variant='primary' classNames='w-full justify-center gap-2' onClick={onPasskey}>
          <Icon icon='ph--key--regular' size={5} />
          <span>{t('sign-in-with-passkey-button.label')}</span>
        </Button>
      )}
      {primary === 'email' && (
        <InlineForm
          inputProps={{
            autoFocus: true,
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
      )}

      {moreOptions.length > 0 && (
        <div className='flex flex-col gap-2'>
          <button
            type='button'
            onClick={() => setMoreOpen(!moreOpen)}
            className='flex items-center justify-center gap-1 text-sm text-description hover:text-white underline underline-offset-4'
          >
            <span>{t('more-ways-to-sign-in')}</span>
            <Icon icon={moreOpen ? 'ph--caret-up--regular' : 'ph--caret-down--regular'} size={4} />
          </button>

          {moreOpen && (
            <div className='flex flex-col gap-1'>
              {moreOptions.map((opt) => (
                <button
                  key={opt.key}
                  type='button'
                  onClick={opt.onClick}
                  className='flex items-center gap-3 px-3 py-2 rounded-md border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 text-left'
                >
                  <Icon icon={opt.icon} size={5} />
                  <div className='flex-1 flex flex-col'>
                    <span className='text-sm'>{opt.label}</span>
                    <span className='text-xs text-description'>{opt.description}</span>
                  </div>
                  <Icon icon='ph--caret-right--regular' size={4} />
                </button>
              ))}
            </div>
          )}
        </div>
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
  onSubmit,
  validation,
}: {
  inputProps: Omit<React.ComponentProps<typeof Input.TextInput>, 'classNames'> & {
    classNames?: string;
    ref?: React.Ref<HTMLInputElement>;
  };
  submitLabel: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  validation?: ReactNode;
}) => {
  const { classNames: inputClasses, ref, ...rest } = inputProps;
  return (
    <Input.Root>
      <div className='flex flex-col gap-2 sm:flex-row sm:gap-0 sm:items-stretch'>
        <Input.TextInput
          ref={ref}
          classNames={mx('bg-black! flex-1 sm:rounded-r-none', inputClasses)}
          {...rest}
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
      {validation ? (
        <Input.DescriptionAndValidation>
          <Input.Validation classNames='flex px-2 pt-2 text-rose-500'>{validation}</Input.Validation>
        </Input.DescriptionAndValidation>
      ) : null}
    </Input.Root>
  );
};

const CompoundRow = ({ icon, onClick, children }: { icon: string; onClick?: () => unknown; children: ReactNode }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center gap-3 px-4 py-3 rounded-md border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 text-left w-full'
  >
    <Icon icon={icon} size={5} />
    <span className='flex-1'>{children}</span>
    <Icon icon='ph--caret-right--bold' size={4} />
  </button>
);

export default Welcome;
