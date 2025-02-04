//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { faker } from '@dxos/random';
import { Dialog, Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Tabs as NaturalTabs } from './Tabs';

faker.seed(1234);

const content = [...Array(24)].reduce((acc: { [key: string]: { title: string; panel: string } }, _, index) => {
  acc[`t${index}`] = {
    title: faker.commerce.productName(),
    panel: faker.lorem.paragraphs(5),
  };
  return acc;
}, {});

export default {
  title: 'ui/react-ui-tabs/Tabs',
  component: NaturalTabs.Root,
  decorators: [withTheme],
  // parameters: { translations },
};

export const Tabs = {
  render: () => {
    return (
      <Dialog.Root open>
        <Dialog.Overlay blockAlign='start'>
          <Dialog.Content classNames='is-[calc(100dvw-4rem)] !max-is-full'>
            <NaturalTabs.Root orientation='vertical' defaultValue={Object.keys(content)[3]} defaultActivePart='list'>
              <NaturalTabs.Viewport>
                <NaturalTabs.Tablist>
                  {Object.entries(content).map(([id, { title }]) => {
                    return (
                      <NaturalTabs.Tab key={id} value={id}>
                        {title}
                      </NaturalTabs.Tab>
                    );
                  })}
                </NaturalTabs.Tablist>
                {Object.entries(content).map(([id, { panel }]) => {
                  return (
                    <NaturalTabs.Tabpanel key={id} value={id} classNames='m-1'>
                      <NaturalTabs.BackButton density='fine'>
                        <Icon icon='ph--arrow-left--bold' size={4} />
                        <span>Back to tab list</span>
                      </NaturalTabs.BackButton>
                      <p className='pli-1'>{panel}</p>
                    </NaturalTabs.Tabpanel>
                  );
                })}
              </NaturalTabs.Viewport>
            </NaturalTabs.Root>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
    );
  },
};
