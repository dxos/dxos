//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useRef } from 'react';

import { Capabilities, chain, createIntent, LayoutAction, useCapability } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import {
  getSpace,
  isReactiveObject,
  isSpace,
  type ReactiveObject,
  type TypedObject,
  useSpaces,
} from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { CreateObjectPanel, type CreateObjectPanelProps } from './CreateObjectPanel';
import { SPACE_PLUGIN } from '../../meta';
import { CollectionType, SpaceAction } from '../../types';

export const CREATE_OBJECT_DIALOG = `${SPACE_PLUGIN}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<CreateObjectPanelProps, 'schemas' | 'target' | 'typename' | 'name'> & {
  resolve?: (typename: string) => Record<string, any>;
  shouldNavigate?: (object: ReactiveObject<any>) => boolean;
};

export const CreateObjectDialog = ({
  schemas,
  target,
  typename,
  name,
  shouldNavigate: _shouldNavigate,
  resolve,
}: CreateObjectDialogProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces();
  const { dispatchPromise: dispatch } = useCapability(Capabilities.IntentDispatcher);

  const handleCreateObject = useCallback(
    async ({
      schema,
      target: _target,
      data,
    }: {
      schema: TypedObject;
      target: CreateObjectPanelProps['target'];
      data?: Record<string, any>;
    }) => {
      const target = isSpace(_target)
        ? (_target.properties[CollectionType.typename]?.target as CollectionType | undefined)
        : _target;
      const createObjectIntent = resolve?.(schema.typename)?.createObject;
      if (!createObjectIntent || !target) {
        // TODO(wittjosiah): UI feedback.
        return;
      }

      // NOTE: Must close before navigating or attention won't follow object.
      closeRef.current?.click();

      const space = isSpace(target) ? target : getSpace(target);
      const result = await dispatch(createObjectIntent(data, { space }));
      const object = result.data?.object;
      if (isReactiveObject(object)) {
        const addObjectIntent = createIntent(SpaceAction.AddObject, { target, object });
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
    <Dialog.Content classNames='p-0 bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-2 pis-2 pie-2 @md:pbs-4 @md:pis-4 @md:pie-4'>
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
