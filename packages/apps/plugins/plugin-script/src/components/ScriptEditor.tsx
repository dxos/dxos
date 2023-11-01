//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type TextObject } from '@dxos/client/echo';

export type ScriptEditorProps = {
  content: TextObject;
};

export const ScriptEditor = ({ content }: ScriptEditorProps) => {
  return (
    <div>
      <h1>ScriptEditor</h1>
      <pre>{String(content.text)}</pre>
    </div>
  );
};
