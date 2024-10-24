//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { ScriptEditor, type ScriptEditorProps } from './ScriptEditor';

const ScriptContainer = ({ script, ...props }: ScriptEditorProps) => {
  const attendableAttrs = useAttendableAttributes(fullyQualifiedId(script));
  return (
    <div role='none' className={mx('flex row-span-2 w-full overflow-hidden attention-surface')} {...attendableAttrs}>
      <ScriptEditor {...props} script={script} />
    </div>
  );
};

export default ScriptContainer;
