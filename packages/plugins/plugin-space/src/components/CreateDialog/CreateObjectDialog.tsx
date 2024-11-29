//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AbstractTypedObject } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { useSpaces, type SpaceId } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { CreateObjectPanel } from './CreateObjectPanel';
import { SPACE_PLUGIN } from '../../meta';

export type CreateObjectDialogProps = {
  schemas: AbstractTypedObject[];
  spaceId?: SpaceId;
  typename?: string;
  name?: string;
  namesCache?: Record<string, string>;
};

// TODO(wittjosiah): This should use form based on schema ideally, but some fields would need to be able to be annotated for omition.
export const CreateObjectDialog = ({ schemas, spaceId, typename, name, namesCache }: CreateObjectDialogProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces();

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames='p-0 bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title>{t('create object dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Button density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={3} />
          </Button>
        </Dialog.Close>
      </div>
      <div className='p-4'>
        <CreateObjectPanel
          schemas={schemas}
          spaces={spaces}
          spaceId={spaceId}
          typename={typename}
          name={name}
          namesCache={namesCache}
          defaultSpaceId={client.spaces.default.id}
          onCreateObject={async ({ schema, space, name }) => {
            console.log({ schema, space, name });
          }}
        />
      </div>
    </Dialog.Content>
  );
};
