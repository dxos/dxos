//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, useEffect, useState } from 'react';

import { Toolbar } from './Toolbar';

export type Module = {
  id: string
  label: string
  modules?: Module[]
  component?: FC
  exec?: () => void
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
    const module = modules.find(module => module.id === option);
    if (module?.component) {
      const Component = module.component;
      setComponent(() => () => <Component />);
    } else if (module?.modules) {
      setComponent(() => () => (
        <ModulePanel
          modules={module.modules!}
        />
      ));
    } else {
      setComponent(() => Blank);
    }
  }, [modules, option]);

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box marginBottom={1}>
        <Toolbar
          items={modules}
          value={option}
          onChange={setOption}
          onSelect={() => {
            const module = modules.find(module => module.id === option);
            module?.exec?.();
          }}
        />
      </Box>

      <Box>
        {Component && (
          <Component />
        )}
      </Box>
    </Box>
  );
};
