//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { createDocAccessor, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { createDataExtensions, listener, stackItemContentEditorClassNames } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';

import { useDeployState, useToolbarState } from '../hooks';
import { type ScriptSettings } from '../types';

import { ScriptToolbar } from './ScriptToolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';

export type ScriptEditorProps = {
  role: string;
  script: ScriptType;
  settings?: ScriptSettings;
} & Pick<TypescriptEditorProps, 'env'>;

export const ScriptContainer = ({ role, script, settings = { editorInputMode: 'vscode' }, env }: ScriptEditorProps) => {
  const identity = useIdentity();
  const space = getSpace(script);
  const state = useToolbarState();
  useDeployState({ state, script });

  const extensions = useMemo(
    () =>
      script.source.target
        ? [
            listener({
              onChange: ({ text }) => {
                if (script.source.target?.content !== text) {
                  script.changed = true;
                }
              },
            }),
            createDataExtensions({
              id: script.id,
              text: createDocAccessor(script.source.target, ['content']),
              space,
              identity,
            }),
          ]
        : [],
    [identity, space, script, script.source.target],
  );

  return (
    <StackItem.Content toolbar>
      <ScriptToolbar state={state} role={role} script={script} />
      <TypescriptEditor
        id={script.id}
        env={env}
        initialValue={script.source?.target?.content}
        extensions={extensions}
        classNames={stackItemContentEditorClassNames(role)}
        inputMode={settings.editorInputMode}
        toolbar
      />
    </StackItem.Content>
  );
};

export default ScriptContainer;
