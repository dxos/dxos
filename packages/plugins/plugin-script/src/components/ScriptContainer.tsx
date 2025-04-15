//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { InvocationTracePanel } from '@dxos/devtools';
import { type ScriptType } from '@dxos/functions/types';
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

export type ScriptEditorProps = ThemedClassName<{
  script: ScriptType;
  variant?: 'logs';
  settings?: ScriptSettingsProps;
  role?: string;
}> &
  Pick<TypescriptEditorProps, 'env'>;

export const ScriptContainer = ({
  role,
  classNames,
  script,
  variant,
  settings = { editorInputMode: 'vscode' },
  env,
}: ScriptEditorProps) => {
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

  const state = useToolbarState();
  useDeployState({ state, script });

  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={variant !== 'logs'}>
      {variant === 'logs' ? (
        <InvocationTracePanel space={space} script={script} detailAxis='block' />
      ) : (
        <>
          <ScriptToolbar state={state} role={role} script={script} />
          <TypescriptEditor
            id={script.id}
            env={env}
            initialValue={script.source?.target?.content}
            extensions={extensions}
            className={mx(stackItemContentEditorClassNames(role), 'grow')}
            inputMode={settings.editorInputMode}
            toolbar
          />
        </>
      )}
    </StackItem.Content>
  );
};

export default ScriptContainer;
