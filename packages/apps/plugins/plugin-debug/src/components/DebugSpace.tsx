//
// Copyright 2023 DXOS.org
//

import {
  ArrowClockwise,
  DownloadSimple,
  Flag,
  FlagPennant,
  HandPalm,
  Play,
  PlusMinus,
  Timer,
  UserCirclePlus,
} from '@phosphor-icons/react';
import React, { type FC, useContext, useMemo, useState } from 'react';

import { DocumentType } from '@dxos/plugin-markdown/types';
import { type ReactiveObject } from '@dxos/echo-schema';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { faker } from '@dxos/random';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { Filter, type Space, useSpaceInvitation } from '@dxos/react-client/echo';
import { InvitationEncoder } from '@dxos/react-client/invitations';
import { Button, Input, useFileDownload } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { safeParseInt } from '@dxos/util';

import { DebugPanel } from './DebugPanel';
import { ObjectCreator } from './ObjectCreator';
import { createSpaceObjectGenerator } from '../scaffolding';
import { DebugContext } from '../types';

const DEFAULT_COUNT = 100;
const DEFAULT_PERIOD = 500;
const DEFAULT_JITTER = 50;

// TODO(burdon): Factor out.
const useRefresh = (): [any, () => void] => {
  const [update, setUpdate] = useState({});
  return [update, () => setUpdate({})];
};

const DebugSpace: FC<{
  space: Space;
  onAddObjects?: (objects: ReactiveObject<any>[]) => void;
}> = ({ space, onAddObjects }) => {
  const { connect } = useSpaceInvitation(space?.key);
  const client = useClient();
  const [data, setData] = useState<any>({});

  const [update, handleUpdate] = useRefresh();
  useAsyncEffect(
    async (isMounted) => {
      const data = await client.diagnostics({ truncate: true });
      if (isMounted()) {
        setData(
          data?.diagnostics?.spaces?.find(({ key }: any) => {
            return space.key.toHex().startsWith(key);
          }),
        );
      }
    },
    [space, update],
  );

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

  const generator = useMemo(() => createSpaceObjectGenerator(space), [space]);

  // TODO(burdon): Note: this is shared across all spaces!
  const { running, start, stop } = useContext(DebugContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
      handleUpdate();
    } else {
      start(
        async () => {
          const { objects } = await space.db.query(Filter.schema(DocumentType)).run();
          if (objects.length) {
            const object = faker.helpers.arrayElement(objects);
            await generator.mutateObject(object, { count: 10, mutationSize: 10, maxContentLength: 1000 });
          }
        },
        {
          count: safeParseInt(mutationCount) ?? 0,
          interval: safeParseInt(mutationInterval) ?? 0,
          jitter: safeParseInt(mutationJitter) ?? 0,
        },
      );
    }
  };

  const handleCreateInvitation = () => {
    const invitation = space.share({
      type: Invitation.Type.INTERACTIVE,
      authMethod: Invitation.AuthMethod.NONE,
      multiUse: true,
    });

    // TODO(burdon): Refactor.
    // TODO(burdon): Unsubscribe?
    connect(invitation);
    const code = InvitationEncoder.encode(invitation.get());
    new URL(window.origin).searchParams.set('spaceInvitationCode', code);
    const url = `${window.origin}?spaceInvitationCode=${code}`;
    void navigator.clipboard.writeText(url);
  };

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
    handleUpdate();
  };

  return (
    <DebugPanel
      menu={
        <>
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
          <Button onClick={handleUpdate}>
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
      <ObjectCreator space={space} onAddObjects={onAddObjects} />
    </DebugPanel>
  );
};

export default DebugSpace;
