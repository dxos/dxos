//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { type FC } from 'react';

import { translations } from '../translations';

import * as IdentityPanels from './IdentityPanel/IdentityPanel.stories';
import * as SpacePanels from './SpacePanel/SpacePanel.stories';

const getComponentNames = (module: any): string[] =>
  module?.__namedExportsOrder ??
  Object.getOwnPropertyNames(module).filter((name) => !(name === 'default' || name.startsWith('__')));

const getComponents = (module: any): FC[] => {
  return getComponentNames(module).map((name) => module[name]);
};

const camelCaseToSpacedName = (camelCase: string) => {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
};

const StoryRow = ({ components }: { components: FC[] }) => {
  return (
    <tr style={{ whiteSpace: 'nowrap' }}>
      {components?.map((Comp) => (
        <td key={Comp.name}>
          <div className='bg-zinc-500 text-zinc-200 p-3 text-sm text-center'>{camelCaseToSpacedName(Comp.name)}</div>
          <Comp />
        </td>
      ))}
    </tr>
  );
};

export const Default = (props: any) => {
  return (
    <table className='bg-body'>
      <tbody>
        <StoryRow components={getComponents(IdentityPanels)} />
        <StoryRow components={getComponents(SpacePanels)} />
        {/* TODO(wittjosiah): The JoinPanel stories changed and don't support this currently. */}
        {/* <StoryRow components={getComponents(JoinPanels)} /> */}
      </tbody>
    </table>
  );
};

Default.parameters = { layout: 'fullscreen' };

const meta = {
  title: 'sdk/shell/All',
  component: StoryRow,
  decorators: [withTheme],

  parameters: {
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof StoryRow>;

export default meta;

type Story = StoryObj<typeof meta>;
