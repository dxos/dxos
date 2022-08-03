//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus } from 'ink';
import React, { FC, useEffect, useState } from 'react';

import { useAppState } from '../../hooks';
import { Toolbar } from './Toolbar';

export type Module = {
  id: string
  label: string
  modules?: Module[]
  component?: FC
  exec?: () => void
}

const Blank = () => <div />;

/**
 * Represents a module including Toolbar menu and contained panel.
 */
export const ModulePanel: FC<{
  module: Module
  ancestors?: string[]
  debug?: boolean
}> = ({
  module,
  ancestors = [],
  debug
}) => {
  const { modules = [] } = module;
  const [option, setOption] = useState<string>();
  const [Component, setComponent] = useState<FC>();
  const { isFocused } = useFocus();
  const [{ path: focus }, { setPath }] = useAppState();

  // Test that we are at least an ancestor of the current path focus.
  const path = [...ancestors, module.id];
  const showContent = path.filter((part, i) => part === focus[i]).length === path.length;

  useEffect(() => {
    if (isFocused) {
      setPath(path);
    }
  }, [isFocused]);

  useEffect(() => {
    // Selected module.
    const module = modules.find(module => module.id === option);

    if (module?.component) {
      const Component = module.component;
      setComponent(() => () => <Component />);
    } else if (module?.modules) {
      setComponent(() => () => (
        <ModulePanel
          ancestors={path}
          module={module}
        />
      ));
    } else {
      setComponent(() => Blank);
    }
  }, [modules, option]);

  return (
    <Box flexDirection='column' flexGrow={1}>
      {debug && (
        <Text>
          {JSON.stringify({ path, focus })}
        </Text>
      )}

      <Box marginBottom={1}>
        <Toolbar
          items={modules}
          isFocused={isFocused}
          value={option}
          onChange={setOption}
          onSelect={() => {
            const module = modules.find(module => module.id === option);
            module?.exec?.();
          }}
        />
      </Box>

      {showContent && (
        <Box>
          {Component && (
            <Component />
          )}
        </Box>
      )}
    </Box>
  );
};
