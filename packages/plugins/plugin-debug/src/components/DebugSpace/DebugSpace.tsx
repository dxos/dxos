//
// Copyright 2023 DXOS.org
//

import React, { type FC, useContext, useMemo, useState } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type ReactiveObject } from '@dxos/live-object';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, type Space, useSpaceInvitation } from '@dxos/react-client/echo';
import { InvitationEncoder } from '@dxos/react-client/invitations';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Icon, IconButton, Input, type IconProps, type TextInputProps, Toolbar, useFileDownload } from '@dxos/react-ui';
import { safeParseInt } from '@dxos/util';

import { ObjectCreator } from './ObjectCreator';
import { DebugContext } from '../../types';
import { Container } from '../Container';

const DEFAULT_COUNT = 100;
const DEFAULT_PERIOD = 500;
const DEFAULT_JITTER = 50;

const useRefresh = (): [any, () => void] => {
  const [update, setUpdate] = useState({});
  return [update, () => setUpdate({})];
};

const CustomInput = ({ icon, ...props }: Pick<IconProps, 'icon'> & TextInputProps) => {
  return (
    <div role='none' className='relative'>
      <Input.Root>
        <Input.TextInput classNames='w-[100px] text-right pie-[22px]' size={5} {...props} />
      </Input.Root>
      <Icon icon={icon} size={3} classNames='absolute inline-end-1 block-start-1 mt-[6px]' />
    </div>
  );
};

export const DebugSpace: FC<{
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
  const handleDownload = async () => {
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
    <Container
      toolbar={
        <Toolbar.Root classNames='p-1'>
          <CustomInput
            icon='ph--flag--regular'
            autoComplete='off'
            placeholder='Count'
            value={mutationCount}
            onChange={({ target: { value } }) => setMutationCount(value)}
          />
          <CustomInput
            icon='ph--timer--regular'
            autoComplete='off'
            placeholder='Interval'
            value={mutationInterval}
            onChange={({ target: { value } }) => setMutationInterval(value)}
          />
          <CustomInput
            icon='ph--plus-minus--regular'
            autoComplete='off'
            placeholder='Jitter'
            value={mutationJitter}
            onChange={({ target: { value } }) => setMutationJitter(value)}
          />

          <IconButton
            icon={running ? 'ph--pause-circle--regular' : 'ph--play-circle--regular'}
            iconOnly
            label='Start/stop'
            size={5}
            onClick={handleToggleRunning}
          />
          <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' size={5} onClick={handleUpdate} />
          <IconButton icon='ph--download-simple--regular' iconOnly label='Download' size={5} onClick={handleDownload} />

          <Toolbar.Expander />
          <IconButton
            icon='ph--flag-pennant--regular'
            iconOnly
            label='Create epoch'
            size={5}
            onClick={handleCreateEpoch}
          />
          <IconButton
            icon='ph--user-circle-plus--regular'
            iconOnly
            iconClassNames='text-blue-500'
            label='Create Invitation'
            size={5}
            onClick={handleCreateInvitation}
          />
        </Toolbar.Root>
      }
    >
      <ObjectCreator space={space} onAddObjects={onAddObjects} />
    </Container>
  );
};
