//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Context } from '@dxos/context';
import { type GetProfileUsageResponse, type MeteringLimit } from '@dxos/protocols';
import { Message, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { useHubHttpClient } from '../../state/use-hub-http';

type UsageState = 'loading' | 'ready' | 'error';

const sumUsageForLimit = (usage: GetProfileUsageResponse['usage'], limit: MeteringLimit): number =>
  usage.reduce(
    (total, item) => (item.category.startsWith(limit.categoryPrefix) ? total + item.amount : total),
    0,
  );

const formatCategoryLabel = (categoryPrefix: string): string => {
  const segments = categoryPrefix.split('/');
  if (segments[0] === 'ai' && segments.length >= 3) {
    const metric = segments.at(-1) ?? categoryPrefix;
    const model = segments.slice(1, -1).join('/');
    return `${model} · ${metric.replace(/([A-Z])/g, ' $1').trim()}`;
  }
  return categoryPrefix;
};

const formatAmount = (amount: number): string => amount.toLocaleString();

const formatWindow = (windowHours: number, t: (key: string, options?: Record<string, unknown>) => string): string => {
  if (windowHours % (24 * 30) === 0) {
    return t('usage-window-months.label', { count: windowHours / (24 * 30) });
  }
  if (windowHours % 24 === 0) {
    return t('usage-window-days.label', { count: windowHours / 24 });
  }
  return t('usage-window-hours.label', { count: windowHours });
};

export const UsageContainer = () => {
  const { t } = useTranslation(meta.id);
  const hubHttp = useHubHttpClient();
  const [usageState, setUsageState] = useState<UsageState>('loading');
  const [profileUsage, setProfileUsage] = useState<GetProfileUsageResponse | undefined>();

  useAsyncEffect(async () => {
    if (!hubHttp) {
      setUsageState('error');
      return;
    }
    setUsageState('loading');
    try {
      const result = await hubHttp.getProfileUsage(new Context());
      setProfileUsage(result);
      setUsageState('ready');
    } catch {
      setUsageState('error');
    }
  }, [hubHttp]);

  const limitRows = useMemo(() => {
    if (!profileUsage) {
      return [];
    }
    return profileUsage.limits.map((limit) => {
      const used = sumUsageForLimit(profileUsage.usage, limit);
      const percent = limit.amount > 0 ? Math.min(100, Math.round((used / limit.amount) * 100)) : 0;
      return { limit, used, percent };
    });
  }, [profileUsage]);

  const uncategorizedUsage = useMemo(() => {
    if (!profileUsage) {
      return [];
    }
    const coveredPrefixes = profileUsage.limits.map((limit) => limit.categoryPrefix);
    return profileUsage.usage.filter(
      (item) => !coveredPrefixes.some((prefix) => item.category.startsWith(prefix)),
    );
  }, [profileUsage]);

  return (
    <Settings.Viewport>
      <Settings.Section title={t('usage-section.title')} description={t('usage-section.description')}>
        {!hubHttp ? (
          <Message.Root valence='warning'>
            <Message.Title icon='ph--cloud-slash--duotone'>{t('usage-unavailable.title')}</Message.Title>
            <Message.Content>{t('usage-unavailable.description')}</Message.Content>
          </Message.Root>
        ) : usageState === 'loading' ? null : usageState === 'error' ? (
          <Message.Root valence='error'>
            <Message.Title icon='ph--cloud-x--duotone'>{t('usage-offline.title')}</Message.Title>
            <Message.Content>{t('usage-offline.description')}</Message.Content>
          </Message.Root>
        ) : limitRows.length === 0 && uncategorizedUsage.length === 0 ? (
          <Message.Root valence='neutral'>
            <Message.Title icon='ph--chart-bar--duotone'>{t('usage-empty.title')}</Message.Title>
            <Message.Content>{t('usage-empty.description')}</Message.Content>
          </Message.Root>
        ) : (
          <>
            {limitRows.map(({ limit, used, percent }) => (
              <Settings.Item
                key={limit.categoryPrefix}
                title={formatCategoryLabel(limit.categoryPrefix)}
                description={t('usage-limit.description', {
                  used: formatAmount(used),
                  limit: formatAmount(limit.amount),
                  window: formatWindow(limit.windowHours, t),
                })}
              >
                <div className='flex flex-col gap-1 items-end min-w-40'>
                  <span className='text-sm tabular-nums'>{percent}%</span>
                  <div className='h-1.5 w-full rounded-full bg-separator overflow-hidden'>
                    <div
                      className='h-full rounded-full bg-primarySurface'
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </Settings.Item>
            ))}
            {uncategorizedUsage.map((item) => (
              <Settings.Item
                key={item.category}
                title={formatCategoryLabel(item.category)}
                description={t('usage-recorded.description', { window: t('usage-current-window.label') })}
              >
                <span className='text-sm tabular-nums justify-self-end'>{formatAmount(item.amount)}</span>
              </Settings.Item>
            ))}
          </>
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};
