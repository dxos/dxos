//
// Copyright 2023 DXOS.org
//

import { Play, HandPalm } from '@phosphor-icons/react';
import { formatDistance } from 'date-fns';
import React, { FC, useContext, useEffect, useMemo, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { Button, DensityProvider, Input, Main, useThemeContext, useTranslation } from '@dxos/aurora';
import { baseSurface, fullSurface, getSize } from '@dxos/aurora-theme';
import { diagnostics } from '@dxos/client/diagnostics';
import { SpaceProxy } from '@dxos/client/echo';
import { useClient, useConfig } from '@dxos/react-client';
import { arrayToBuffer } from '@dxos/util';

import { DEBUG_PLUGIN, DebugContext } from '../props';
import { Generator } from '../testing';

export const DEFAULT_PERIOD = 500;

export const DebugMain: FC<{ data: { space: SpaceProxy } }> = ({ data: { space } }) => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const { themeMode } = useThemeContext();
  const style = themeMode === 'dark' ? styleDark : styleLight;

  const client = useClient();
  const config = useConfig();
  const [data, setData] = useState<any>({});
  const handleRefresh = async () => {
    const data = await diagnostics(client, { humanize: false, truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

  const [mutationInterval, setMutationInterval] = useState(String(DEFAULT_PERIOD));

  const generator = useMemo(() => {
    const generator = new Generator(space);
    void generator.initialize();
    return generator;
  }, [space]);

  // TODO(burdon): Note shared across spaces!
  const { running, start, stop } = useContext(DebugContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
      void handleRefresh();
    } else {
      start(() => generator.updateObject(), parseInt(mutationInterval));
    }
  };

  const handleCreateObject = async () => {
    generator.createObject();
  };

  const handleUpdateObject = async () => {
    generator.updateObject();
  };

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
    await handleRefresh();
  };

  const handleOpenDevtools = () => {
    const vaultUrl = config.values?.runtime?.client?.remoteSource;
    if (vaultUrl) {
      window.open(`https://devtools.dev.dxos.org/?target=vault:${vaultUrl}`);
    }
  };

  return (
    <Main.Content classNames={[fullSurface, baseSurface]}>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={handleCreateObject}>Create</Button>
          <Button onClick={handleUpdateObject}>Update</Button>
          <div className='w-[80px]'>
            <Input.Root>
              <Input.TextInput
                title={t('mutation period')}
                autoComplete='off'
                classNames='flex-1 is-auto pis-2 text-right'
                placeholder='Mutation period'
                value={mutationInterval}
                onChange={({ target: { value } }) => setMutationInterval(value)}
              />
            </Input.Root>
          </div>
          <Button onClick={handleToggleRunning}>
            {running ? <HandPalm className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>

          <div className='grow' />
          <Button onClick={handleOpenDevtools}>Open Devtools</Button>
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleCreateEpoch}>Create epoch</Button>
        </DensityProvider>
      </div>

      <div className='flex grow overflow-hidden px-2'>
        <div className='flex flex-col w-full overflow-auto space-y-2'>
          {config.values?.runtime?.app?.build?.timestamp && (
            <div style={styleDark}>
              <pre className='px-2 text-xs'>Build</pre>
              <div className='px-2'>
                {formatDistance(new Date(config.values?.runtime?.app?.build?.timestamp), new Date(), {
                  addSuffix: true,
                  includeSeconds: true,
                })}
              </div>
            </div>
          )}
          <div style={styleDark}>
            <pre className='p-2 text-sm'>Config</pre>
            <SyntaxHighlighter language='json' style={style}>
              {JSON.stringify(config.values, replacer, 2)}
            </SyntaxHighlighter>
          </div>
          <div style={styleDark}>
            <pre className='px-2 text-xs'>Diagnostics</pre>
            <SyntaxHighlighter language='json' style={style}>
              {JSON.stringify(data, replacer, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </Main.Content>
  );
};

// TODO(burdon): Refactor from devtools.
const replacer = (key: any, value: any) => {
  if (typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return arrayToBuffer(value).toString('hex');
    }

    if (value?.type === 'Buffer') {
      return Buffer.from(value.data).toString('hex');
    }

    if (key === 'downloaded') {
      return undefined;
    }
  }

  return value;
};
