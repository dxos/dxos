//
// Copyright 2024 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Tooltip, useTranslation } from '@dxos/react-ui';

import { StatusBar } from '#components';
import { meta } from '#meta';

export type VersionNumberProps = {};

const VERSION_REGEX = /([\d.]+)/;

export const VersionNumber = (_props: VersionNumberProps) => {
  const { t } = useTranslation(meta.id);
  const config = useConfig();
  const { version, timestamp } = config.values.runtime?.app?.build ?? {};
  const [_, short] = version?.match(VERSION_REGEX) ?? [];

  if (!short) {
    return null;
  }

  const releasedAt = timestamp ? new Date(timestamp) : undefined;
  const released =
    releasedAt && isValid(releasedAt)
      ? t('released.message', { released: formatDistance(releasedAt, new Date(), { addSuffix: true }) })
      : undefined;

  const content = (
    <div className='flex flex-col items-start gap-0.5'>
      <span className='font-mono'>{version}</span>
      {released && <span className='text-xs'>{released}</span>}
    </div>
  );

  return (
    <Tooltip.Trigger asChild content={content} side='top'>
      <StatusBar.Button classNames='h-full text-xs'>{short}</StatusBar.Button>
    </Tooltip.Trigger>
  );
};
