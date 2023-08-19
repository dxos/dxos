//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
// import * as JoinPanels from './JoinPanel/JoinPanel.stories';
import * as IdentityPanels from './IdentityPanel/IdentityPanel.stories';
import * as SpacePanels from './SpacePanel/SpacePanel.stories';

const getComponentNames = (module: any): string[] =>
  module?.__namedExportsOrder ??
  Object.getOwnPropertyNames(module).filter((name) => !(name === 'default' || name.startsWith('__')));

const getComponents = (module: any): React.FC[] => {
  const components = getComponentNames(module).map((name) => module[name]);
  console.log(module);
  return components;
};

const StoryRow = ({ components }: { components: React.FC[] }) => {
  return (
    <div className='flex flex-row'>
      {components?.map((Comp) => (
        <div className='' key={Comp.name}>
          <Comp />
        </div>
      ))}
    </div>
  );
};

export const AllPanels = (props: any) => {
  return (
    <>
      <StoryRow components={getComponents(SpacePanels)} />
      <StoryRow components={getComponents(IdentityPanels)} />
      {/* <StoryRow components={getComponents(JoinPanels)} /> */}
    </>
  );
};

export default {
  title: 'Panels/All',
  component: StoryRow,
};
