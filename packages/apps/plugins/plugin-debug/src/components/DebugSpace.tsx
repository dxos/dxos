//
// Copyright 2023 DXOS.org
//

import {
  ArrowClockwise,
  DotsThreeVertical,
  DownloadSimple,
  FileText,
  Flag,
  FlagPennant,
  HandPalm,
  Play,
  Plus,
  PlusMinus,
  Table,
  Timer,
  UserCirclePlus,
} from '@phosphor-icons/react';
import React, { type FC, useContext, useEffect, useMemo, useState } from 'react';

import { type Schema, type ReactiveObject } from '@dxos/echo-schema';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { type Space, useSpaceInvitation } from '@dxos/react-client/echo';
import { InvitationEncoder } from '@dxos/react-client/invitations';
import { Button, DropdownMenu, Input, useFileDownload, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { safeParseInt } from '@dxos/util';

import { DebugPanel } from './DebugPanel';
import { SchemaList } from './SchemaList';
import { Json } from './Tree';
import { Generator } from '../testing';
import { DebugContext } from '../types';

const DEFAULT_COUNT = 100;
const DEFAULT_PERIOD = 500;
const DEFAULT_JITTER = 50;

const DebugSpace: FC<{ space: Space; onAddObjects?: (objects: ReactiveObject<any>[]) => void }> = ({
  space,
  onAddObjects,
}) => {
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

  const generator = useMemo(() => new Generator(space), [space]);

  // TODO(burdon): Note: this is shared across all spaces!
  const { running, start, stop } = useContext(DebugContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
      void handleRefresh();
    } else {
      start(
        async () => {
          generator.updateDocument();
        },
        {
          count: safeParseInt(mutationCount) ?? 0,
          interval: safeParseInt(mutationInterval) ?? 0,
          jitter: safeParseInt(mutationJitter) ?? 0,
        },
      );
    }
  };

  const handleCreate = (schema: Schema, count: number) => {
    generator.createObjects({ [schema.typename]: count });
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button>
                <DotsThreeVertical />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item onClick={() => onAddObjects?.([generator.createDocument()])}>
                    <FileText className={getSize(5)} />
                    <p>Create document</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onAddObjects?.(generator.createTables())}>
                    <Table className={getSize(5)} />
                    <p>Create tables</p>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => generator.createObjects()}>
                    <Plus className={getSize(5)} />
                    <p>Create objects</p>
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

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
      <div className={'shrink-0'}>
        <SchemaList space={space} onCreate={handleCreate} />
      </div>
      <Json theme={themeMode} data={data} />
    </DebugPanel>
  );
};

export default DebugSpace;
