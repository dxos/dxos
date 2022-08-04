//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
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
  const { focus, isFocused } = useFocus({ id: module.id });
  const { focusPrevious, focusNext } = useFocusManager();

  // Test that we are at least an ancestor of the current path focus.
  const [{ path: currentPath }, { setPath }] = useAppState();
  const path = [...ancestors, module.id];
  const showContent = path.filter((part, i) => part === currentPath[i]).length === path.length;

  // Set the app focus state when focused.
  useEffect(() => {
    if (isFocused) {
      setPath(path);
    }
  }, [isFocused]);

  // Change selection when toolbar option changes.
  useEffect(() => {
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

  useInput((input, key) => {
    if (key.escape) {
      // Refocus this module.
      focus(module.id);
    } if (key.return) {
      // Execute handler.
      const module = modules.find(module => module.id === option);
      module?.exec?.();
    } else if (key.upArrow) {
      // Select previous level.
      if (ancestors.length) {
        focusPrevious();
      }
    } else if (key.downArrow) {
      // TODO(burdon): Prevent wrap to top if container doesn't accept focus.
      focusNext();
    }
  }, { isActive: isFocused });

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
          value={option}
          onChange={setOption}
          isFocused={isFocused}
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
