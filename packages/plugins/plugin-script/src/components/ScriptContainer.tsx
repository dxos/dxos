//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { type Script } from '@dxos/functions';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { StackItem } from '@dxos/react-ui-stack';
import { createDataExtensions, listener, stackItemContentEditorClassNames } from '@dxos/ui-editor';

import { useDeployState, useToolbarState } from '../hooks';
import { type ScriptSettings } from '../types';

import { ScriptToolbar } from './ScriptToolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';

export type ScriptEditorProps = {
  role: string;
  script: Script.Script;
  settings?: ScriptSettings;
} & Pick<TypescriptEditorProps, 'env'>;

export const ScriptContainer = ({ role, script, settings = { editorInputMode: 'vscode' }, env }: ScriptEditorProps) => {
  const identity = useIdentity();
  const space = getSpace(script);
  const state = useToolbarState();
  useDeployState({ script, state });

  const extensions = useMemo(() => {
    if (!script.source.target) {
      return [];
    }

    return [
      createDataExtensions({
        id: script.id,
        text: createDocAccessor(script.source.target, ['content']),
        messenger: space,
        identity,
      }),
      listener({
        onChange: ({ text }) => {
          if (script.source.target?.content !== text) {
            script.changed = true;
          }
        },
      }),
    ];
  }, [identity, space, script, script.source.target]);

  if (!extensions.length) {
    return null;
  }

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
