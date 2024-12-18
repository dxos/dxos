//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type MetadataResolver, NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { type AbstractTypedObject, getSpace, isReactiveObject, isSpace, useSpaces } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { CreateObjectPanel, type CreateObjectPanelProps } from './CreateObjectPanel';
import { SPACE_PLUGIN, SpaceAction } from '../../meta';
import { CollectionType } from '../../types';

export const CREATE_OBJECT_DIALOG = `${SPACE_PLUGIN}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<CreateObjectPanelProps, 'schemas' | 'target' | 'typename' | 'name'> & {
  resolve?: MetadataResolver;
  navigableCollections?: boolean;
};

export const CreateObjectDialog = ({
  schemas,
  target,
  typename,
  name,
  navigableCollections,
  resolve,
}: CreateObjectDialogProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces();
  const dispatch = useIntentDispatcher();

  const handleCreateObject = useCallback(
    async ({
      schema,
      target: _target,
      name,
    }: {
      schema: AbstractTypedObject;
      target: CreateObjectPanelProps['target'];
      name?: string;
    }) => {
      const target = isSpace(_target)
        ? (_target.properties[CollectionType.typename]?.target as CollectionType)
        : _target;
      const createObjectAction = resolve?.(schema.typename)?.createObject;
      if (!createObjectAction || !target) {
        // TODO(wittjosiah): UI feedback.
        return;
      }

      // NOTE: Must close before navigating or attention won't follow object.
      closeRef.current?.click();

      const space = isSpace(target) ? target : getSpace(target);
      const result = await dispatch({ action: createObjectAction, data: { name, space } });
      const object = result?.data;
      if (isReactiveObject(object)) {
        await dispatch([
          {
            plugin: SPACE_PLUGIN,
            action: SpaceAction.ADD_OBJECT,
            data: { target, object },
          },
          ...(!(object instanceof CollectionType) || navigableCollections ? [{ action: NavigationAction.OPEN }] : []),
        ]);
      }
    },
    [dispatch, resolve],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title>{t('create object dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button ref={closeRef} density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>
      <div className='p-4'>
        <CreateObjectPanel
          schemas={schemas}
          spaces={spaces}
          target={target}
          typename={typename}
          name={name}
          defaultSpaceId={client.spaces.default.id}
          resolve={resolve}
          onCreateObject={handleCreateObject}
        />
      </div>
    </Dialog.Content>
  );
};
