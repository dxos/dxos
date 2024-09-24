//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useHasAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { ScriptEditor, type ScriptEditorProps } from './ScriptEditor';

const ScriptContainer = ({ script, ...props }: ScriptEditorProps) => {
  const hasAttention = useHasAttention(fullyQualifiedId(script));
  return (
    <div role='none' className={mx('flex row-span-2 w-full overflow-hidden', hasAttention && 'attention-surface')}>
      <ScriptEditor {...props} script={script} />
    </div>
  );
};

export default ScriptContainer;
