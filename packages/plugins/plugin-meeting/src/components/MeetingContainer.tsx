//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlGroupButton } from '@dxos/react-ui-form';
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

  return (
    <ControlGroup classNames='p-4 place-content-center'>
      <ControlItemInput title={t('display name label')} description={t('display name description')}>
        <Input.TextInput
          value={displayName}
          onChange={handleChange}
          placeholder={t('display name input placeholder')}
          classNames='md:min-is-64'
        />
      </ControlItemInput>
      <ControlGroupButton disabled={!displayName} onClick={handleSave}>
        {t('set display name label')}
      </ControlGroupButton>
    </ControlGroup>
  );
};
