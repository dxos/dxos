//
// Copyright 2024 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Flex, Tooltip, useTranslation } from '@dxos/react-ui';

import { StatusBar } from '#components';
import { meta } from '#meta';

export type VersionNumberProps = {};

const VERSION_REGEX = /([\d.]+)/;

export const VersionNumber = (_props: VersionNumberProps) => {
  const { t } = useTranslation(meta.profile.key);
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
    <Flex column gap='xs' align='start'>
      <span className='font-mono'>{version}</span>
      {released && <span className='text-xs'>{released}</span>}
    </Flex>
  );

  return (
    <Tooltip.Trigger asChild content={content} side='top'>
      <StatusBar.Button classNames='h-full text-xs'>{short}</StatusBar.Button>
    </Tooltip.Trigger>
  );
};

VersionNumber.displayName = 'VersionNumber';
