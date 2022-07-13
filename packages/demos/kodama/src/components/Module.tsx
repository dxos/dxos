//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useEffect, useState } from 'react';

import { Menu } from './Menu';

export type Module = {
  id: string
  label: string
  modules?: Module[]
  component?: FC
}

const Blank = () => <div />;

export const ModulePanel: FC<{
  modules: Module[]
}> = ({
  modules
}) => {
  const [option, setOption] = useState<string>();
  const [Component, setComponent] = useState<FC>();
  useEffect(() => {
    const module = modules.find(m => m.id === option);
    if (module?.component) {
      const Component = module.component;
      setComponent(() => () => (
        // <Panel>
          <Component />
        // </Panel>
      ));
    } else if (module?.modules) {
      setComponent(() => () => <ModulePanel modules={module.modules!} />);
    } else {
      setComponent(() => Blank);
    }
  }, [option]);

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Menu
        onChange={setOption}
        items={modules}
        value={option}
      />

      <Box>
        {Component && (
          <Component />
        )}
      </Box>
    </Box>
  );
};
