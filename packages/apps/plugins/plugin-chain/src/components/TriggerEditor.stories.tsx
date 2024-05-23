//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';

const TriggerEditorStory = () => {
  const space = useSpace();

  return (
    <div role='none' className='is-full pli-8'>
      <TriggerEditor space={space} />
    </div>
  );
};

export default {
  title: 'plugin-chain/TriggerEditor',
  // TODO(Zan): Client Repeater can register schemas
  render: () => <ClientRepeater component={TriggerEditorStory} createIdentity createSpace />,
  decorators: [withTheme],
};

export const Default = {};
