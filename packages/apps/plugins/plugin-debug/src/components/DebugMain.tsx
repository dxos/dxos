//
// Copyright 2023 DXOS.org
//

import {
  ArrowClockwise,
  DownloadSimple,
  Flag,
  FlagPennant,
  HandPalm,
  PaperPlaneRight,
  Play,
  Plus,
  PlusMinus,
  Timer,
  Toolbox,
  Trash,
} from '@phosphor-icons/react';
import { formatDistance } from 'date-fns';
import React, { FC, useContext, useEffect, useMemo, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { GraphImpl } from '@braneframe/plugin-graph';
import { Button, DensityProvider, Input, Main, useThemeContext } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/client/echo';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useConfig } from '@dxos/react-client';
import { useSpaceInvitation } from '@dxos/react-client/echo';
import { arrayToBuffer, safeParseInt } from '@dxos/util';

import { Tree } from './Tree';
import { DebugContext } from '../props';
import { Generator } from '../testing';

export const DEFAULT_COUNT = 100;
export const DEFAULT_PERIOD = 500;
export const DEFAULT_JITTER = 50;

/**
 * File download anchor.
 *
 * const download = useDownload();
 * const handleDownload = (data: string) => {
 *   download(new Blob([data], { type: 'text/plain' }), 'test.txt');
 * };
 */
// TODO(burdon): Factor out.
export const useFileDownload = (): ((data: Blob | string, filename: string) => void) => {
  return useMemo(
    () => (data: Blob | string, filename: string) => {
      const url = typeof data === 'string' ? data : URL.createObjectURL(data);
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', filename);
      element.setAttribute('target', 'download');
      element.click();
    },
    [],
  );
};

export const DebugMain: FC<{ data: { graph: GraphImpl; space: Space } }> = ({ data: { graph, space } }) => {
  const { themeMode } = useThemeContext();
  const style = themeMode === 'dark' ? styleDark : styleLight;

  const { connect } = useSpaceInvitation(space?.key);
  const client = useClient();
  const config = useConfig();
  const [data, setData] = useState<any>({});
  const handleRefresh = async () => {
    const data = await client.diagnostics({ truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

  const download = useFileDownload();
  const handleCopy = async () => {
    download(
      new Blob([JSON.stringify(data, undefined, 2)], { type: 'text/plain' }),
      `${new Date().toISOString().replace(/\W/g, '-')}.json`,
    );
  };

  const [mutationCount, setMutationCount] = useState(String(DEFAULT_COUNT));
  const [mutationInterval, setMutationInterval] = useState(String(DEFAULT_PERIOD));
  const [mutationJitter, setMutationJitter] = useState(String(DEFAULT_JITTER));

  const generator = useMemo(() => {
    const generator = new Generator(space);
    void generator.initialize();
    return generator;
  }, [space]);

  // TODO(burdon): Note: this is shared across all spaces!
  const { running, start, stop } = useContext(DebugContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
      void handleRefresh();
    } else {
      start(
        async () => {
          await generator.updateObject();
        },
        {
          count: safeParseInt(mutationCount) ?? 0,
          interval: safeParseInt(mutationInterval) ?? 0,
          jitter: safeParseInt(mutationJitter) ?? 0,
        },
      );
    }
  };

  const handleCreateObject = async (createContent: boolean) => {
    // generator.createObject({ createContent });
    generator.createTables();
  };

  const handleCreateInvitation = () => {
    const invitation = space.share({
      type: Invitation.Type.MULTIUSE,
      authMethod: Invitation.AuthMethod.NONE,
    });

    // TODO(burdon): Refactor.
    // TODO(burdon): Unsubscribe?
    connect(invitation);
    const code = InvitationEncoder.encode(invitation.get());
    const url = `${window.origin}?spaceInvitationCode=${code}`;
    void navigator.clipboard.writeText(url);
  };

  const handleResetClient = async () => {
    await client.reset();
    window.location.href = window.location.origin;
  };

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
    await handleRefresh();
  };

  const handleOpenDevtools = () => {
    const vaultUrl = config.values?.runtime?.client?.remoteSource;
    if (vaultUrl) {
      window.open(`https://devtools.dev.dxos.org/?target=${vaultUrl}`);
    }
  };

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={(event) => handleCreateObject(event.shiftKey)}>
            <Plus className={getSize(5)} />
          </Button>
          <div className='relative' title='mutation count'>
            <Input.Root>
              <Input.TextInput
                autoComplete='off'
                size={5}
                classNames='w-[100px] text-right pie-[22px]'
                placeholder='Count'
                value={mutationCount}
                onChange={({ target: { value } }) => setMutationCount(value)}
              />
            </Input.Root>
            <Flag className={mx('absolute inline-end-1 block-start-1 mt-[6px]', getSize(3))} />
          </div>
          <div className='relative' title='mutation period'>
            <Input.Root>
              <Input.TextInput
                autoComplete='off'
                size={5}
                classNames='w-[100px] text-right pie-[22px]'
                placeholder='Interval'
                value={mutationInterval}
                onChange={({ target: { value } }) => setMutationInterval(value)}
              />
            </Input.Root>
            <Timer className={mx('absolute inline-end-1 block-start-1 mt-[6px]', getSize(3))} />
          </div>
          <div className='relative' title='mutation jitter'>
            <Input.Root>
              <Input.TextInput
                autoComplete='off'
                size={5}
                classNames='w-[100px] text-right pie-[22px]'
                placeholder='Jitter'
                value={mutationJitter}
                onChange={({ target: { value } }) => setMutationJitter(value)}
              />
            </Input.Root>
            <PlusMinus className={mx('absolute inline-end-1 block-start-1 mt-[6px]', getSize(3))} />
          </div>
          <Button onClick={handleToggleRunning}>
            {running ? <HandPalm className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>
          <Button onClick={handleRefresh}>
            <ArrowClockwise className={getSize(5)} />
          </Button>
          <Button onClick={handleCopy}>
            <DownloadSimple className={getSize(5)} />
          </Button>

          <div className='grow' />
          <Button onClick={handleCreateInvitation} title='Create Space invitation'>
            <PaperPlaneRight className={getSize(5)} />
          </Button>
          <Button onClick={handleOpenDevtools} title='Open Dectools'>
            <Toolbox weight='duotone' className={mx(getSize(5), 'text-red-700')} />
          </Button>
          <Button onClick={handleCreateEpoch} title='Create epoch'>
            <FlagPennant className={getSize(5)} />
          </Button>
          {/* TODO(burdon): Alert or shift key. */}
          <Button onClick={handleResetClient} title='Reset client'>
            <Trash className={getSize(5)} />
          </Button>
        </DensityProvider>
      </div>

      <div className='flex flex-col grow px-2 overflow-hidden'>
        <div className='flex flex-col grow overflow-auto'>
          <Tree data={graph.toJSON()} />
          {false && (
            <SyntaxHighlighter language='json' style={style} className='w-full'>
              {JSON.stringify(data, replacer, 2)}
            </SyntaxHighlighter>
          )}
        </div>

        {config.values?.runtime?.app?.build?.timestamp && (
          <div className='p-2 text-sm font-mono'>
            {config.values?.runtime?.app?.build?.version} (
            {formatDistance(new Date(config.values?.runtime?.app?.build?.timestamp), new Date(), {
              addSuffix: true,
              includeSeconds: true,
            })}
            )
          </div>
        )}
      </div>
    </Main.Content>
  );
};

export default DebugMain;

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
