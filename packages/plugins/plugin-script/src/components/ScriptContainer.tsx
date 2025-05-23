//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { createDocAccessor, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { createDataExtensions, listener, stackItemContentEditorClassNames } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { ScriptToolbar } from './ScriptToolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { useDeployState, useToolbarState } from '../hooks';
import { type ScriptSettingsProps } from '../types';

export type ScriptEditorProps = ThemedClassName<
  {
    role?: string;
    script: ScriptType;
    settings?: ScriptSettingsProps;
  } & Pick<TypescriptEditorProps, 'env'>
>;

export const ScriptContainer = ({
  classNames,
  role,
  script,
  settings = { editorInputMode: 'vscode' },
  env,
}: ScriptEditorProps) => {
  const identity = useIdentity();
  const space = getSpace(script);
  const state = useToolbarState();
  useDeployState({ state, script });

  const extensions = useMemo(
    () => [
      listener({
        onChange: (text) => {
          if (script.source.target && script.source.target.content !== text) {
            script.changed = true;
          }
        },
      }),
      createDataExtensions({
        id: script.id,
        text: script.source.target && createDocAccessor(script.source.target, ['content']),
        space,
        identity,
      }),
    ],
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
        className={mx(stackItemContentEditorClassNames(role))}
        inputMode={settings.editorInputMode}
        toolbar
      />
    </StackItem.Content>
  );
};

export default ScriptContainer;
