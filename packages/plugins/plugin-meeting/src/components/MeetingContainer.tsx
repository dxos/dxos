//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { ControlItemInput } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { CallContainer } from './CallContainer';
import { MEETING_PLUGIN } from '../meta';
import { type MeetingType } from '../types';

export const MeetingContainer = ({ meeting }: { meeting: MeetingType }) => {
  const identity = useIdentity();

  return (
    <StackItem.Content>
      {identity?.profile?.displayName ? <CallContainer meeting={meeting} /> : <DisplayNameMissing />}
    </StackItem.Content>
  );
};

export default MeetingContainer;

const DisplayNameMissing = () => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const client = useClient();
  const [displayName, setDisplayName] = useState('');
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value), []);
  const handleSave = useCallback(() => client.halo.updateProfile({ displayName }), [client, displayName]);

  // TODO(wittjosiah): Styles copied from ProfileContainer. Should probably be factored out for this style of form.
  return (
    <div className='flex flex-col justify-center gap-4 p-0 container-max-width [&_[role="form"]]:grid [&_[role="form"]]:grid-cols-1 md:[&_[role="form"]]:grid-cols-[1fr_min-content] [&_[role="form"]]:gap-4'>
      <div role='form' className='flex flex-col w-full gap-2 '>
        <ControlItemInput title={t('display name label')} description={t('display name description')}>
          <Input.TextInput
            value={displayName}
            onChange={handleChange}
            placeholder={t('display name input placeholder')}
            classNames='min-is-64'
          />
        </ControlItemInput>
      </div>
      <Button disabled={!displayName} onClick={handleSave}>
        {t('set display name label')}
      </Button>
    </div>
  );
};
