//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Button, Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { buyPremium, createStripeCheckout } from '#services';
import { Settings } from '#types';

type Status = {
  kind: 'idle' | 'pending' | 'result' | 'error';
  text?: string;
};

export type PaymentsSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const PaymentsSettings = ({ settings, onSettingsChange }: PaymentsSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const paymentsUrl = settings.paymentsUrl?.trim();

  const handleBuyPremium = useCallback(async () => {
    if (!paymentsUrl) {
      setStatus({ kind: 'error', text: t('no-payments-url.message') });
      return;
    }
    setStatus({ kind: 'pending' });
    try {
      const result = await buyPremium(client, paymentsUrl);
      setStatus({ kind: 'result', text: JSON.stringify(result, null, 2) });
    } catch (err) {
      log.catch(err);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  }, [client, paymentsUrl, t]);

  const handleBuyCredits = useCallback(async () => {
    if (!paymentsUrl) {
      setStatus({ kind: 'error', text: t('no-payments-url.message') });
      return;
    }
    setStatus({ kind: 'pending' });
    try {
      const { url } = await createStripeCheckout(client, paymentsUrl, 100);
      // Redirect the browser to the hosted Stripe Checkout page.
      window.location.href = url;
    } catch (err) {
      log.catch(err);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  }, [client, paymentsUrl, t]);

  const pending = status.kind === 'pending';

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      readonly={!onSettingsChange}
      values={settings}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.FieldSet />
            <div className='flex flex-col gap-2 mlb-2'>
              <Button disabled={pending || !paymentsUrl} onClick={handleBuyPremium}>
                {pending ? t('pending.label') : t('buy-premium.label')}
              </Button>
              <Button disabled={pending || !paymentsUrl} onClick={handleBuyCredits}>
                {pending ? t('pending.label') : t('buy-credits.label')}
              </Button>
              {status.kind === 'result' && (
                <pre className='text-xs whitespace-pre-wrap overflow-auto'>{status.text}</pre>
              )}
              {status.kind === 'error' && (
                <Message.Root valence='error'>
                  <Message.Title>{t('error.label')}</Message.Title>
                  <Message.Content>{status.text}</Message.Content>
                </Message.Root>
              )}
            </div>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

PaymentsSettings.displayName = 'PaymentsSettings';
