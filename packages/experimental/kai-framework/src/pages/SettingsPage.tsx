//
// Copyright 2022 DXOS.org
//

import { ArrowUUpLeft } from '@phosphor-icons/react';
import formatDistance from 'date-fns/formatDistance';
import React from 'react';
import { Link } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { Input } from '@dxos/react-appkit';
import { useConfig } from '@dxos/react-client';
import { useKeyStore } from '@dxos/react-client/halo';
import { Input as NaturalInput } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { bool, botKeys, optionsKeys, useAppState } from '../hooks';

// prettier-ignore
const credentialKeys = [
  'dxos.services.bot.proxy',
  ...Object.keys(botKeys)
];

const SettingsPage = () => {
  const config = useConfig();
  const state = useAppState();
  const [options, setOptions] = useKeyStore(optionsKeys);
  const [keys, setKey] = useKeyStore(credentialKeys);

  const handleUpdateOption = (key: string, value: boolean) => {
    setOptions(key, String(value));
  };

  const handleUpdateKey = (key: string, value: string) => {
    setKey(key, value);
  };

  return (
    <div className='flex overflow-hidden w-full h-full'>
      <div className='flex flex-col mx-auto overflow-hidden align-center'>
        <div className='flex items-center justify-between p-2 bg-appbar-header'>
          <div className='flex w-full items-center'>
            <Link to='/' title='Home'>
              <ArrowUUpLeft className={mx(getSize(6))} />
            </Link>
            <div className='grow' />
            <div className='text-sm'>
              v{config.values.runtime?.app?.build?.version} [
              {formatDistance(new Date(config.values.runtime?.app?.build?.timestamp ?? ''), Date.now(), {
                addSuffix: true,
              })}
              ]
            </div>
          </div>
        </div>

        {/* TODO(burdon): Checkbox. */}
        <div className='flex flex-1 flex-col overflow-y-scroll text-sm w-full md:w-[800px] md:max-w-[800px] shadow-1'>
          <div className='flex flex-col'>
            <h2 className='p-2 bg-paper-3-bg'>OPTIONS</h2>
            <div className='py-4 bg-white'>
              {Array.from(options.entries()).map(([key, value]) => (
                <div key={key} className='flex px-4 py-2 items-center'>
                  <NaturalInput.Root id={key}>
                    <NaturalInput.Checkbox
                      checked={bool(value)}
                      onCheckedChange={(value) => {
                        handleUpdateOption(key, !!value);
                      }}
                    />
                  </NaturalInput.Root>
                  <div className='px-2'>{key}</div>
                </div>
              ))}
            </div>
          </div>

          <div className='flex flex-col'>
            <h2 className='p-2 bg-paper-3-bg'>KEYS</h2>
            <div className='py-4 bg-white'>
              {Array.from(keys.entries()).map(([key, value]) => (
                <div key={key} className='flex flex-col px-2 p-1'>
                  <div className='px-2 py-1 w-[300px] mr-4'>{key}</div>
                  <Input
                    variant='subdued'
                    slots={{ root: { className: 'w-full border-b px-2' }, input: { spellCheck: false } }}
                    label={key}
                    labelVisuallyHidden
                    placeholder='Enter value'
                    value={value ?? ''}
                    onChange={(ev) => handleUpdateKey(key, ev.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className='flex flex-col'>
            <h2 className='p-2 bg-paper-3-bg'>STATE</h2>
            <SyntaxHighlighter className='w-full' language='json' style={style}>
              {JSON.stringify(state, undefined, 2)}
            </SyntaxHighlighter>
          </div>

          <div className='flex flex-col'>
            <h2 className='p-2 bg-paper-3-bg'>CONFIG</h2>
            <SyntaxHighlighter className='w-full' language='json' style={style}>
              {JSON.stringify(config.values, undefined, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
