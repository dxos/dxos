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
}

const Blank = () => <div />;

export const ModulePanel: FC<{
  modules: Module[]
  parent?: string
}> = ({
  modules,
  parent
}) => {
  const [option, setOption] = useState<string>();
  const [Component, setComponent] = useState<FC>();
  useEffect(() => {
    const module = modules.find(m => m.id === option);
    if (module?.component) {
      const Component = module.component;
      setComponent(() => () => <Component />);
    } else if (module?.modules) {
      setComponent(() => () => (
        <ModulePanel
          parent={option}
          modules={module.modules!}
        />
      ));
    } else {
      setComponent(() => Blank);
    }
  }, [option]);

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box>
        {/*
        {parent && (
          <Text>{parent}</Text>
        )}
        */}

        <Toolbar
          onChange={setOption}
          items={modules}
          value={option}
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
