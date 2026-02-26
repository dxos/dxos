//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { type Script } from '@dxos/functions';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Layout } from '@dxos/react-ui';
import { createDataExtensions, listener, stackItemContentEditorClassNames } from '@dxos/ui-editor';

import { ScriptToolbar } from '../../components/ScriptToolbar';
import { TypescriptEditor, type TypescriptEditorProps } from '../../components/TypescriptEditor';
import { useDeployState, useToolbarState } from '../../hooks';
import { type ScriptSettings } from '../../types';

export type ScriptEditorProps = SurfaceComponentProps<
  Script.Script,
  {
    settings?: ScriptSettings;
  } & Pick<TypescriptEditorProps, 'env'>
>;

export const ScriptContainer = ({
  role,
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
            Obj.change(script, (s) => {
              s.changed = true;
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
    <Layout.Main role={role} toolbar>
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
    </Layout.Main>
  );
};
