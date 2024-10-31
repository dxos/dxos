//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { PromptEditor, PromptEditorProps } from './PromptEditor';

type PromptContainerProps = PromptEditorProps;

const PromptContainer = (props: PromptContainerProps) => {
  return (
    <div role='none' className='row-span-2 pli-2'>
      <PromptEditor {...props} />
    </div>
  );
};

export default PromptContainer;
