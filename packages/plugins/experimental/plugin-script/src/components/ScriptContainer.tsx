//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { ScriptEditor, type ScriptEditorProps } from './ScriptEditor';

const ScriptContainer = (props: ScriptEditorProps) => {
  return (
    <StackItem.Content toolbar>
      <ScriptEditor {...props} />
    </StackItem.Content>
  );
};

export default ScriptContainer;
