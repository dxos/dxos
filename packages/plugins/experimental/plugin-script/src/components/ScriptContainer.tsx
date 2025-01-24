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

import { DebugPanel } from './DebugPanel';
import { ScriptToolbar } from './ScriptToolbar';
import { useDeployState } from './ScriptToolbar/deploy';
import { useToolbarState } from './ScriptToolbar/useToolbarState';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { type ScriptSettingsProps } from '../types';

export type ScriptEditorProps = ThemedClassName<{
  script: ScriptType;
  settings: ScriptSettingsProps;
  role?: string;
}> &
  Pick<TypescriptEditorProps, 'env'>;

export const ScriptContainer = ({ role, classNames, script, settings, env }: ScriptEditorProps) => {
  const identity = useIdentity();
  const space = getSpace(script);

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
    [script, script.source.target, space, identity],
  );

  const state = useToolbarState({ view: 'split' });
  useDeployState({ state, script });

  return (
    <StackItem.Content toolbar>
      <ScriptToolbar state={state} role={role} script={script} />
      <div role='none' className={mx('flex flex-col w-full overflow-hidden divide-y divide-separator', classNames)}>
        {state.view !== 'debug' && (
          <TypescriptEditor
            id={script.id}
            env={env}
            initialValue={script.source?.target?.content}
            extensions={extensions}
            className={stackItemContentEditorClassNames(role)}
            inputMode={settings.editorInputMode}
            toolbar
          />
        )}

        {state.view !== 'editor' && <DebugPanel functionUrl={state.functionUrl} />}
      </div>
    </StackItem.Content>
  );
};

export default ScriptContainer;
