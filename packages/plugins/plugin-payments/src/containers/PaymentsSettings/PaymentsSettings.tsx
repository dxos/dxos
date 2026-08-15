//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useState } from 'react';

import { useCapabilities, useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Identity } from '@dxos/halo';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Banner, Button, Flex, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { buyPremium, createStripeCheckout } from '#services';
import { Settings } from '#types';

type Status = {
  kind: 'idle' | 'pending' | 'result' | 'error';
  text?: string;
};

export type PaymentsSettingsProps = AppSurface.SettingsData;

export const PaymentsSettings = ({ subject }: PaymentsSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [identityService] = useCapabilities(ClientCapabilities.IdentityService);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // Resolved per action rather than held in state: the presentation signer is only valid while the
  // identity is signed in, and both handlers fail loudly when it is not.
  const getEdgeIdentity = useCallback((): Identity.EdgeIdentity | undefined => {
    const edgeIdentity = identityService?.getEdgeIdentity();
    return edgeIdentity && Option.getOrUndefined(edgeIdentity);
  }, [identityService]);

  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
  const paymentsUrl = settings.paymentsUrl?.trim();

  const handleBuyPremium = useCallback(async () => {
    if (!paymentsUrl) {
      setStatus({ kind: 'error', text: t('no-payments-url.message') });
      return;
    }

    const identity = getEdgeIdentity();
    if (!identity) {
      setStatus({ kind: 'error', text: t('no-identity.message') });
      return;
    }

    setStatus({ kind: 'pending' });
    try {
      const result = await buyPremium(identity, paymentsUrl);
      setStatus({ kind: 'result', text: JSON.stringify(result, null, 2) });
    } catch (err) {
      log.catch(err);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  }, [getEdgeIdentity, paymentsUrl, t]);

  const handleBuyCredits = useCallback(async () => {
    if (!paymentsUrl) {
      setStatus({ kind: 'error', text: t('no-payments-url.message') });
      return;
    }

    const identity = getEdgeIdentity();
    if (!identity) {
      setStatus({ kind: 'error', text: t('no-identity.message') });
      return;
    }

    setStatus({ kind: 'pending' });
    try {
      const { url } = await createStripeCheckout(identity, paymentsUrl, 100);
      // Redirect the browser to the hosted Stripe Checkout page.
      window.location.href = url;
    } catch (err) {
      log.catch(err);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  }, [getEdgeIdentity, paymentsUrl, t]);

  const pending = status.kind === 'pending';

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.FieldSet />
            <Flex column gap='sm' classNames='my-2'>
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
                <Banner.Root valence='error'>
                  <Banner.Content>
                    <Banner.Title>{t('error.label')}</Banner.Title>
                    <Banner.Body>{status.text}</Banner.Body>
                  </Banner.Content>
                </Banner.Root>
              )}
            </Flex>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

PaymentsSettings.displayName = 'PaymentsSettings';
