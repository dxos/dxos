//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Button, Icon, Input } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useTelegramUserClient } from '#hooks';
import { type TelegramUserCapabilities, type TelegramUserConnectionStatus } from '#types';

export type TelegramUserSettingsProps = {
  settings: TelegramUserCapabilities.Settings;
  onSettingsChange: (fn: (current: TelegramUserCapabilities.Settings) => TelegramUserCapabilities.Settings) => void;
};

/**
 * Settings surface for plugin-telegram-user. Drives the multi-step MTProto
 * login: phone → SMS code → (optional) 2FA password → save session string.
 *
 * If the user already has a saved session, shows a "connected, disconnect"
 * state and auto-reconnects on mount.
 */
export const TelegramUserSettings = ({ settings, onSettingsChange }: TelegramUserSettingsProps) => {
  const { status, error, startLogin, submitCode, submitPassword, connectWithSession, disconnect } =
    useTelegramUserClient();

  const [apiIdInput, setApiIdInput] = useState(settings.apiId ?? '');
  const [apiHashInput, setApiHashInput] = useState(settings.apiHash ?? '');
  const [phoneInput, setPhoneInput] = useState(settings.phoneNumber ?? '');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const updatePartial = useCallback(
    (partial: Partial<TelegramUserCapabilities.Settings>) => {
      onSettingsChange((current) => ({ ...current, ...partial }));
    },
    [onSettingsChange],
  );

  // Auto-reconnect if we have a saved session.
  useEffect(() => {
    if (settings.sessionString && settings.apiId && settings.apiHash && status === 'disconnected') {
      void connectWithSession({
        apiId: Number(settings.apiId),
        apiHash: settings.apiHash,
        sessionString: settings.sessionString,
      });
    }
  }, [settings.sessionString, settings.apiId, settings.apiHash, status, connectWithSession]);

  const handleStartLogin = useCallback(async () => {
    const apiIdNumber = Number(apiIdInput);
    if (!Number.isInteger(apiIdNumber) || apiIdNumber <= 0 || !apiHashInput || !phoneInput) {
      return;
    }
    updatePartial({ apiId: apiIdInput, apiHash: apiHashInput, phoneNumber: phoneInput });
    const sessionString = await startLogin({ apiId: apiIdNumber, apiHash: apiHashInput, phoneNumber: phoneInput });
    if (sessionString) {
      updatePartial({ sessionString });
    }
  }, [apiIdInput, apiHashInput, phoneInput, startLogin, updatePartial]);

  const handleSubmitCode = useCallback(() => {
    if (codeInput.trim()) {
      submitCode(codeInput.trim());
      setCodeInput('');
    }
  }, [codeInput, submitCode]);

  const handleSubmitPassword = useCallback(() => {
    if (passwordInput) {
      submitPassword(passwordInput);
      setPasswordInput('');
    }
  }, [passwordInput, submitPassword]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    updatePartial({ sessionString: undefined });
  }, [disconnect, updatePartial]);

  return (
    <div className='flex flex-col gap-4 p-3'>
      <div className='flex flex-col gap-2'>
        <h3 className='text-sm font-medium'>Telegram (personal account)</h3>
        <p className='text-xs text-description'>
          Syncs every DM, group, and channel from your personal Telegram account into a unified inbox. Uses the MTProto
          user protocol — a real Telegram login, same as the official apps.
        </p>
        <div className='flex items-center gap-2'>
          <StatusIndicator status={status} />
          <span className='text-sm text-description'>
            {statusLabel(status)}
            {error && ` — ${error}`}
          </span>
        </div>
      </div>

      {settings.sessionString && status === 'connected' ? (
        <div className='flex gap-2'>
          <Button variant='ghost' onClick={handleDisconnect}>
            <Icon icon='ph--plugs--regular' size={4} />
            Disconnect + forget session
          </Button>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          <p className='text-xs text-description'>
            Get an <code className='font-mono'>api_id</code> and <code className='font-mono'>api_hash</code> from{' '}
            <a
              className='underline'
              href='https://my.telegram.org/apps'
              target='_blank'
              rel='noreferrer'
            >
              my.telegram.org/apps
            </a>
            . One-time setup.
          </p>

          <Labelled label='API ID'>
            <Input.Root>
              <Input.TextInput
                placeholder='12345678'
                value={apiIdInput}
                onChange={(event) => setApiIdInput(event.target.value)}
                type='text'
                inputMode='numeric'
                classNames='font-mono text-xs'
                disabled={status === 'logging-in' || status === 'need-code' || status === 'need-password'}
              />
            </Input.Root>
          </Labelled>

          <Labelled label='API Hash'>
            <Input.Root>
              <Input.TextInput
                placeholder='0123456789abcdef…'
                value={apiHashInput}
                onChange={(event) => setApiHashInput(event.target.value)}
                type='password'
                classNames='font-mono text-xs'
                disabled={status === 'logging-in' || status === 'need-code' || status === 'need-password'}
              />
            </Input.Root>
          </Labelled>

          <Labelled label='Phone number (with country code)'>
            <Input.Root>
              <Input.TextInput
                placeholder='+14155551212'
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                type='tel'
                classNames='font-mono text-xs'
                disabled={status === 'logging-in' || status === 'need-code' || status === 'need-password'}
              />
            </Input.Root>
          </Labelled>

          {status === 'need-code' && (
            <div className='flex flex-col gap-1'>
              <Labelled label='Enter SMS / Telegram code'>
                <Input.Root>
                  <Input.TextInput
                    placeholder='12345'
                    value={codeInput}
                    onChange={(event) => setCodeInput(event.target.value)}
                    type='text'
                    inputMode='numeric'
                    classNames='font-mono text-xs'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSubmitCode();
                      }
                    }}
                  />
                </Input.Root>
              </Labelled>
              <Button variant='primary' onClick={handleSubmitCode} disabled={!codeInput.trim()}>
                Submit code
              </Button>
            </div>
          )}

          {status === 'need-password' && (
            <div className='flex flex-col gap-1'>
              <Labelled label='Two-factor password'>
                <Input.Root>
                  <Input.TextInput
                    placeholder='••••••••'
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    type='password'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSubmitPassword();
                      }
                    }}
                  />
                </Input.Root>
              </Labelled>
              <Button variant='primary' onClick={handleSubmitPassword} disabled={!passwordInput}>
                Submit password
              </Button>
            </div>
          )}

          <div className='flex gap-2'>
            <Button
              variant='primary'
              onClick={handleStartLogin}
              disabled={
                !apiIdInput.trim() ||
                !apiHashInput.trim() ||
                !phoneInput.trim() ||
                status === 'logging-in' ||
                status === 'need-code' ||
                status === 'need-password'
              }
            >
              <Icon icon='ph--plug--regular' size={4} />
              Connect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const statusLabel = (status: TelegramUserConnectionStatus): string => {
  switch (status) {
    case 'disconnected':
      return 'Not connected';
    case 'need-credentials':
      return 'Credentials needed';
    case 'logging-in':
      return 'Connecting…';
    case 'need-code':
      return 'Waiting for SMS code';
    case 'need-password':
      return 'Waiting for 2FA password';
    case 'connected':
      return 'Connected';
    case 'error':
      return 'Error';
  }
};

const StatusIndicator = ({ status }: { status: TelegramUserConnectionStatus }) => (
  <div
    className={mx(
      'size-2 rounded-full',
      status === 'connected' && 'bg-green-500',
      (status === 'logging-in' || status === 'need-code' || status === 'need-password') && 'bg-yellow-500 animate-pulse',
      status === 'error' && 'bg-red-500',
      (status === 'disconnected' || status === 'need-credentials') && 'bg-neutral-400',
    )}
  />
);

const Labelled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className='flex flex-col gap-1'>
    <span className='text-xs text-description'>{label}</span>
    {children}
  </label>
);
