//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import * as IdentityPanels from './IdentityPanel/IdentityPanel.stories';
import * as JoinPanels from './JoinPanel/JoinPanel.stories';
import * as SpacePanels from './SpacePanel/SpacePanel.stories';

const getComponentNames = (module: any): string[] =>
  module?.__namedExportsOrder ??
  Object.getOwnPropertyNames(module).filter((name) => !(name === 'default' || name.startsWith('__')));

const getComponents = (module: any): React.FC[] => {
  const components = getComponentNames(module).map((name) => module[name]);
  console.log(module);
  return components;
};

const camelCaseToSpacedName = (camelCase: string) => {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
};

const StoryRow = ({ components }: { components: React.FC[] }) => {
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

export const AllPanels = (props: any) => {
  return (
    <table className='bg-body'>
      <tbody>
        <StoryRow components={getComponents(IdentityPanels)} />
        <StoryRow components={getComponents(SpacePanels)} />
        <StoryRow components={getComponents(JoinPanels)} />
      </tbody>
    </table>
  );
};

AllPanels.parameters = { layout: 'fullscreen' };

export default {
  title: 'Panels/All',
  decorators: [withTheme],
  component: StoryRow,
};
