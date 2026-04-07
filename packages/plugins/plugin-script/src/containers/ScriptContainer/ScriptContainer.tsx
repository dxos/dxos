//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { type Script } from '@dxos/functions';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel } from '@dxos/react-ui';
import { createDataExtensions, listener, editorClassNames } from '@dxos/ui-editor';

import { ScriptToolbar, TypescriptEditor, type TypescriptEditorProps } from '../../components';
import { useDeployState, useToolbarState } from '../../hooks';
import { type Settings } from '../../types';

export type ScriptEditorProps = ObjectSurfaceProps<
  Script.Script,
  {
    settings?: Settings.Settings;
  } & Pick<TypescriptEditorProps, 'env'>
>;

export const ScriptContainer = ({
  role,
  attendableId,
  subject: script,
  settings = { editorInputMode: 'vscode' },
  env,
}: ScriptEditorProps) => {
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
            Obj.change(script, (obj) => {
              obj.changed = true;
            });
          }
        },
      }),
    ];
  }, [identity, space, script, script.source.target]);

  if (!extensions.length) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <ScriptToolbar script={script} attendableId={attendableId} state={state} role={role} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TypescriptEditor
          classNames={editorClassNames(role)}
          id={script.id}
          env={env}
          initialValue={script.source?.target?.content}
          extensions={extensions}
          inputMode={settings.editorInputMode}
          toolbar
        />
      </Panel.Content>
    </Panel.Root>
  );
};
