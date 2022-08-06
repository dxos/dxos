//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import React, { FC, useEffect, useMemo, useState } from 'react';

import { useAppState, useModule } from '../../hooks';

export type MenuItem = {
  // Module ID must match parent item.
  id: string
  // Display label.
  label: string
  // Child component or module.
  component?: FC<{ parent: string }>
  // Command to exec on ENTER.
  exec?: (item: MenuItem) => void
}

/**
 * Horizontal menu item selector.
 */
const Toolbar: FC<{
  focused: boolean
  items: MenuItem[]
  selected?: string
}> = ({
  focused,
  items,
  selected
}) => {
  return (
    <Box>
      {items.map(({ id, label }, i) => (
        <Box
          key={id}
          marginRight={1}
        >
          {i !== 0 && (
            <Text color='#666'>| </Text>
          )}

          <Text
            dimColor={!focused}
            color={selected === id ? 'green' : 'white'}
            underline={selected === id}
          >
            {label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Modules support horizontal toolbars, which can display components, which can be other Modules.
 */
export const Module: FC<{
  id: string
  items: MenuItem[]
  parent?: string
}> = ({
  id,
  items,
  parent
}) => {
  const [{ debug }] = useAppState();
  const { focusNext } = useFocusManager();
  const [activePath, setPath, modules] = useModule();
  const [activeItem, setActiveItem] = useState<string>();

  const ourPath = [parent, id].filter(Boolean).join('.');
  const { isFocused } = useFocus({ id: ourPath });

  const showContent = activePath?.startsWith(ourPath);
  const Component = useMemo(() => items.find(item => item.id === activeItem)?.component, [activeItem]);

  // Init.
  useEffect(() => {
    modules.add(ourPath);
    if (!activeItem) {
      setActiveItem(items[0]?.id);
    }

    return () => {
      modules.delete(ourPath);
    };
  }, []);

  // Set global context on focus.
  useEffect(() => {
    if (isFocused) {
      setPath(ourPath);
    }
  }, [isFocused]);

  // Navigation.
  useInput((input, key) => {
    const i = items.findIndex(item => item.id === activeItem);
    if (key.return) {
      const item = items.find(item => item.id === activeItem);
      item?.exec?.(item);
    } if (key.upArrow) {
      if (parent) {
        setPath(parent);
      }
    } if (key.downArrow) {
      const childPath = [ourPath, activeItem].join('.');
      if (modules.has(childPath)) {
        setPath(childPath); // Child module.
      } else {
        focusNext();
      }
    } if (key.leftArrow) {
      setActiveItem(items[Math.max(0, i - 1)].id);
    } else if (key.rightArrow) {
      setActiveItem(items[Math.min(items.length - 1, i + 1)].id);
    }
  }, { isActive: isFocused });

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box flexGrow={1}>
        {debug && (
          <Text dimColor color='blue'>[{ourPath}] </Text>
        )}

        <Text dimColor={!isFocused}>{'> '}</Text>

        <Toolbar
          focused={isFocused}
          items={items}
          selected={activeItem}
        />
      </Box>

      {showContent && Component && (
        <Box marginTop={1}>
          <Component
            parent={ourPath}
          />
        </Box>
      )}
    </Box>
  );
};
