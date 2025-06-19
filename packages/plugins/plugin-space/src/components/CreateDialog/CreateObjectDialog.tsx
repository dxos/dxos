//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useRef } from 'react';

import {
  Capabilities,
  LayoutAction,
  chain,
  createIntent,
  useCapabilities,
  useIntentDispatcher,
  usePluginManager,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { getSpace, isLiveObject, isSpace, type Live, useSpaces } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { CreateObjectPanel, type CreateObjectPanelProps } from './CreateObjectPanel';
import { SpaceCapabilities } from '../../capabilities';
import { SPACE_PLUGIN } from '../../meta';
import { SpaceAction } from '../../types';

export const CREATE_OBJECT_DIALOG = `${SPACE_PLUGIN}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<CreateObjectPanelProps, 'target' | 'typename' | 'name'> & {
  shouldNavigate?: (object: Live<any>) => boolean;
};

export const CreateObjectDialog = ({
  target,
  typename,
  name,
  shouldNavigate: _shouldNavigate,
}: CreateObjectDialogProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const manager = usePluginManager();
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const forms = useCapabilities(SpaceCapabilities.ObjectForm);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (typename) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );

  const handleCreateObject = useCallback<NonNullable<CreateObjectPanelProps['onCreateObject']>>(
    async ({ form, target, data = {} }) => {
      if (!target) {
        // TODO(wittjosiah): UI feedback.
        return;
      }

      // NOTE: Must close before navigating or attention won't follow object.
      closeRef.current?.click();

      const space = isSpace(target) ? target : getSpace(target);
      invariant(space, 'Missing space');
      const result = await dispatch(form.getIntent(data, { space }));
      const object = result.data?.object;
      if (isLiveObject(object)) {
        const addObjectIntent = createIntent(SpaceAction.AddObject, { target, object, hidden: form.hidden });
        const shouldNavigate = _shouldNavigate ?? (() => true);
        if (shouldNavigate(object)) {
          await dispatch(pipe(addObjectIntent, chain(LayoutAction.Open, { part: 'main' })));
        } else {
          await dispatch(addObjectIntent);
        }
      }
    },
    [dispatch, resolve],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-2 pis-2 pie-2 @md:pbs-4 @md:pis-4 @md:pie-4'>
        <Dialog.Title>{t('create object dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button ref={closeRef} density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>

      <CreateObjectPanel
        classNames='p-4'
        forms={forms}
        spaces={spaces}
        target={target}
        typename={typename}
        name={name}
        defaultSpaceId={client.spaces.default.id}
        resolve={resolve}
        onCreateObject={handleCreateObject}
      />
    </Dialog.Content>
  );
};
