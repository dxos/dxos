//
// Copyright 2023 DXOS.org
//

import { type Monaco } from '@monaco-editor/react';
import initMermaid from 'monaco-mermaid';
import React, { useEffect, useState } from 'react';

import { ScriptEditor, Splitter, SplitterSelector, type View } from '@braneframe/plugin-script';
import { type TextObject } from '@dxos/client/echo';
import { DensityProvider, Toolbar, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import { MermaidDiagram } from './MermaidDiagram';

export type MermaidEditorProps = {
  id: string;
  source: TextObject;
  view?: View;
  hideSelector?: boolean;
  classes?: {
    root?: string;
    toolbar?: string;
  };
};

export const MermaidEditor = ({ id, source, view: controlledView, hideSelector, classes }: MermaidEditorProps) => {
  const { themeMode } = useThemeContext();
  const [view, setView] = useState<View>(controlledView ?? 'editor');
  useEffect(() => setView(controlledView ?? 'editor'), [controlledView]);

  // https://github.com/Yash-Singh1/monaco-mermaid/blob/main/index.ts
  const handleBeforeMount = (monaco: Monaco) => {
    initMermaid(monaco);
  };

  return (
    <div className={mx('flex flex-col grow overflow-hidden', classes?.root)}>
      {!hideSelector && (
        <DensityProvider density={'fine'}>
          <Toolbar.Root classNames={mx('mb-2', classes?.toolbar)}>
            <SplitterSelector view={view} onChange={setView} />
          </Toolbar.Root>
        </DensityProvider>
      )}

      <Splitter view={view}>
        <ScriptEditor
          id={id}
          language={'mermaid'}
          content={source.content as YText}
          themeMode={themeMode}
          onBeforeMount={handleBeforeMount}
        />
        <MermaidDiagram source={source.toString()} />
      </Splitter>
    </div>
  );
};
