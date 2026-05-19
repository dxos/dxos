//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';

const DXOS_GUILD_ID = '837138313172353095';

export const DiscordPanel = () => {
  const { themeMode } = useThemeContext();
  return (
    <iframe
      title='DXOS Discord'
      src={`https://discord.com/widget?id=${DXOS_GUILD_ID}&theme=${themeMode}`}
      className='block is-full bs-full border-0'
      sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts'
    />
  );
};
