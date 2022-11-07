//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { defaultConfig, Item } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient } from '@dxos/react-client';
import { Loading } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

import { DOCUMENT_TYPE } from '../../model';
import { templateForComponent } from '../../testing';
import { Composer, ComposerProps } from './Composer';

export default {
  title: 'react-composer/Composer',
  component: Composer,
  argTypes: {}
};

const Template = (args: Omit<ComposerProps, 'item'>) => {
  const client = useClient();
  const [item, setItem] = useState<Item<TextModel>>();

  useAsyncEffect(async () => {
    // TODO(burdon): Set in constructor (too late here).
    client.echo.registerModel(TextModel);
    // TODO(burdon): Observer.
    await client.halo.createProfile();
    // TODO(burdon): Observer.
    const space = await client.echo.createParty();
    const item = await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
    setItem(item);
  }, []);

  return <main>{item ? <Composer {...args} item={item} /> : <Loading label='Loading…' />}</main>;
};

export const Default = templateForComponent(Template)({});
Default.args = {};
Default.decorators = [
  // TODO(wittjosiah): Factor out.
  (Story) => (
    <ClientProvider config={defaultConfig}>
      <Story />
    </ClientProvider>
  )
];
