//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { createDocAccessor, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createDataExtensions, listener, stackItemContentEditorClassNames } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { DebugPanel } from './DebugPanel';
import { ScriptToolbar } from './ScriptToolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { useDeployState, useToolbarState } from '../hooks';
import { type ScriptSettingsProps } from '../types';
import { SCRIPT_PLUGIN } from '../meta';
import { useClient } from '@dxos/react-client';

export type ScriptEditorProps = ThemedClassName<{
  script: ScriptType;
  settings?: ScriptSettingsProps;
  role?: string;
}> &
  Pick<TypescriptEditorProps, 'compiler'>;

export const ScriptContainer = ({ role, classNames, compiler, settings, script }: ScriptEditorProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
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

  const state = useToolbarState({ view: 'editor' });
  useDeployState({ state, script });

  return (
    <StackItem.Content toolbar>
      <ScriptToolbar state={state} role={role} script={script} />
      <div role='none' className={mx('flex flex-col w-full overflow-hidden divide-y divide-separator', classNames)}>
        {state.view !== 'debug' && (
          <TypescriptEditor
            id={script.id}
            compiler={compiler}
            initialValue={script.source?.target?.content}
            extensions={extensions}
            className={stackItemContentEditorClassNames(role)}
            inputMode={settings?.editorInputMode}
            toolbar
          />
        )}

        {state.view !== 'editor' && <DebugPanel functionUrl={state.functionUrl} />}
      </div>
    </StackItem.Content>
  );
};

export default ScriptContainer;
