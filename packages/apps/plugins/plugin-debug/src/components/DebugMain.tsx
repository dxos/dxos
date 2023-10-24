//
// Copyright 2023 DXOS.org
//

import {
  ArrowClockwise,
  DownloadSimple,
  Flag,
  FlagPennant,
  Gauge,
  Graph as GraphIcon,
  Gear,
  HandPalm,
  Play,
  Plus,
  PlusMinus,
  Timer,
  Toolbox,
  UserCirclePlus,
  Warning,
} from '@phosphor-icons/react';
import { formatDistance } from 'date-fns';
import React, {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type Graph } from '@braneframe/plugin-graph';
import { type Space } from '@dxos/client/echo';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useConfig } from '@dxos/react-client';
import { useSpaceInvitation } from '@dxos/react-client/echo';
import { Button, DensityProvider, Input, Main, ToggleGroup, ToggleGroupItem, useThemeContext } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, getSize, mx } from '@dxos/react-ui-theme';
import { safeParseInt } from '@dxos/util';

import { Json, Tree } from './Tree';
import { useFileDownload } from './util';
import { DebugContext } from '../props';
import { Generator } from '../testing';

export const DEFAULT_COUNT = 100;
export const DEFAULT_PERIOD = 500;
export const DEFAULT_JITTER = 50;

export const DebugPanel: FC<PropsWithChildren<{ menu: ReactNode }>> = ({ menu, children }) => {
  const config = useConfig();
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>{menu}</DensityProvider>
      </div>
      <div className='flex flex-col grow px-2 overflow-hidden'>
        <div className='flex flex-col grow overflow-auto'>{children}</div>

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

export const DebugMain: FC<{ graph: Graph; space?: Space }> = ({ graph, space }) => {
  if (!space) {
    return <DebugGlobal graph={graph} />;
  }

  return <DebugSpace space={space} />;
};

export const DebugGlobal: FC<{ graph: Graph }> = ({ graph }) => {
  const { themeMode } = useThemeContext();
  const [view, setView] = useState<'config' | 'diagnostics' | 'graph'>('diagnostics');
  const [data, setData] = useState<any>({});
  const client = useClient();
  const config = useConfig();
  const handleRefresh = async () => {
    const data = await client.diagnostics({ truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleResetClient = async (force = false) => {
    if (!force && !window.confirm('Reset storage?')) {
      return;
    }

    // TODO(burdon): Throws exception.
    await client.reset();
    window.location.href = window.location.origin;
  };

  const handleOpenDevtools = () => {
    const vaultUrl = config.values?.runtime?.client?.remoteSource;
    if (vaultUrl) {
      window.open(`https://devtools.dev.dxos.org/?target=${vaultUrl}`);
    }
  };

  return (
    <DebugPanel
      menu={
        <>
          <ToggleGroup type='single' value={view}>
            <ToggleGroupItem value={'graph'} onClick={() => setView('graph')} title={'Plugin graph'}>
              <GraphIcon className={getSize(5)} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'diagnostics'} onClick={() => setView('diagnostics')} title={'Diagnostics'}>
              <Gauge className={getSize(5)} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'config'} onClick={() => setView('config')} title={'Config'}>
              <Gear className={getSize(5)} />
            </ToggleGroupItem>
          </ToggleGroup>

          <div className='grow' />
          <Button onClick={(event) => handleResetClient(event.shiftKey)} title='Reset client'>
            <Warning className={mx(getSize(5), 'text-red-700')} />
          </Button>
          <Button onClick={handleOpenDevtools} title='Open Devtools'>
            <Toolbox weight='duotone' className={mx(getSize(5), 'text-700')} />
          </Button>
        </>
      }
    >
      {view === 'graph' && <Tree data={graph.toJSON()} />}
      {view === 'config' && <Json theme={themeMode} data={data.diagnostics?.config} />}
      {view === 'diagnostics' && <Json theme={themeMode} data={data} />}
    </DebugPanel>
  );
};

export const DebugSpace: FC<{ space: Space }> = ({ space }) => {
  const { themeMode } = useThemeContext();
  const { connect } = useSpaceInvitation(space?.key);
  const client = useClient();
  const [data, setData] = useState<any>({});
  const handleRefresh = async () => {
    const data = await client.diagnostics({ truncate: true });
    setData(
      data?.diagnostics?.spaces?.find(({ key }: any) => {
        return space.key.toHex().startsWith(key);
      }),
    );
  };
  useEffect(() => {
    void handleRefresh();
  }, [space]);

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

  const handleCreateObject = async (createTables: boolean) => {
    if (createTables) {
      generator.createTables();
    } else {
      generator.createObject();
    }
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

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
    await handleRefresh();
  };

  return (
    <DebugPanel
      menu={
        <>
          <Button
            onClick={(event) => handleCreateObject(event.shiftKey)}
            title={'Create content; hold SHIFT to create tables.'}
          >
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
          <Button onClick={handleCreateEpoch} title='Create epoch'>
            <FlagPennant className={mx(getSize(5))} />
          </Button>
          <Button onClick={handleCreateInvitation} title='Create Space invitation'>
            <UserCirclePlus className={mx(getSize(5), 'text-blue-500')} />
          </Button>
        </>
      }
    >
      <Json theme={themeMode} data={data} />
    </DebugPanel>
  );
};

export default DebugMain;
