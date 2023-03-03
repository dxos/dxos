//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { Button } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';
import { BotClient } from './bot-client';

export const BotFrame = () => {
  const [status, setStatus] = useState('');
  const [response, setResponse] = useState({});
  const [botClient, setBotClient] = useState<BotClient>();
  const { space } = useAppRouter();

  useEffect(() => {
    if (!space) {
      return;
    }

    const botClient = new BotClient(space);
    setBotClient(botClient);

    return botClient.onStatusUpdate.on((status) => {
      setStatus(status);
      void refresh();
    });
  }, [space]);

  useEffect(() => {
    void refresh();
  }, [botClient]);

  const refresh = async () => {
    const response = (await botClient?.refresh()) ?? {};
    setResponse(response);
  };

  if (!botClient) {
    return null;
  }

  return (
    <div>
      <div className='flex items-center p-2'>
        <Button className='mr-2' onClick={refresh}>
          Refresh
        </Button>
        <Button className='mr-2' onClick={() => botClient.addBot()}>
          Start Bot
        </Button>
        <div>{status}</div>
      </div>

      <SyntaxHighlighter className='w-full' language='json' style={style}>
        {JSON.stringify(response, undefined, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
