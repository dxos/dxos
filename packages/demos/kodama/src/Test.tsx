//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';

import { Panel } from './components';

// TODO(burdon): Focused panel hierarchy. Test Module/Toolbar.

// TODO(burdon): Wrap TextInput with input.
const Panel1 = () => {
  const [text, setText] = useState('');
  const { isFocused } = useFocus({ id: 'current' });
  const { focus, focusNext, focusPrevious } = useFocusManager();

  useEffect(() => {
    // console.log('P1', isFocused);
  }, [isFocused]);

  useInput((input, key) => {
    if (key.escape) {
      setText(''); // TODO(burdon): Revert value.
      focus('current');
    } else if (key.upArrow) {
      focusPrevious();
    } else if (key.downArrow) {
      focusNext();
    }
  }, { isActive: isFocused });

  return (
    <Panel focused={isFocused}>
      <TextInput
        placeholder='Text'
        focus={isFocused}
        value={text}
        onChange={setText}
        onSubmit={() => {
        }}
      />
    </Panel>
  );
};

const Panel2 = () => {
  const { isFocused } = useFocus();

  return (
    <Panel focused={isFocused}>
      <Text>Hello</Text>
    </Panel>
  );
};

export const Test = () => {
  return (
    <Box flexDirection='column'>
      <Panel2 />
      <Panel1 />
      <Panel2 />
    </Box>
  );
};
