//
// Copyright 2026 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import React, { forwardRef, useEffect, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { FileTree } from '#components';
import { meta } from '#meta';
import { type CodeProject, type SourceFile } from '#types';

export type CodeArticleProps = AppSurface.ObjectArticleProps<CodeProject.CodeProject>;

const languageForPath = (path: string) => {
  if (path.endsWith('.md') || path.endsWith('.mdx')) {
    return markdown();
  }
  return javascript({ typescript: path.endsWith('.ts') || path.endsWith('.tsx') });
};

// Three-pane layout mirroring `react-ui-introspect`'s `ToolsExplorer`:
//
//   ┌───────────┬─────────────────┐
//   │  Browse   │                 │
//   │  (files)  │     Output      │
//   ├───────────┤   (editor)      │
//   │  Inspect  │                 │
//   │  (form)   │                 │
//   └───────────┴─────────────────┘
//
// 30rem fixed left column, 1fr right; left split 1:2 vertically. Same
// `dx-container grid` + `divide-x`/`divide-y separator` idiom as the
// introspect explorer so the visual rhythm matches across panels.
export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(({ role, subject: project }, forwardedRef) => {
  const { t } = useTranslation(meta.id);

  // Trigger re-render on files mutations.
  useObject(project);
  const fileRefs = useMemo(() => project.files ?? [], [project.files]);

  const [resolvedFiles, setResolvedFiles] = useState<SourceFile.SourceFile[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(fileRefs.map((ref) => ref.load())).then((files) => {
      if (!cancelled) {
        const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
        setResolvedFiles(sorted);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileRefs]);

  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedPath && resolvedFiles.length > 0) {
      setSelectedPath(resolvedFiles[0].path);
    }
    if (selectedPath && !resolvedFiles.some((file) => file.path === selectedPath)) {
      setSelectedPath(resolvedFiles[0]?.path);
    }
  }, [resolvedFiles, selectedPath]);

  const selected = useMemo(
    () => resolvedFiles.find((file) => file.path === selectedPath),
    [resolvedFiles, selectedPath],
  );

  const fileEntries = useMemo(() => resolvedFiles.map(({ path }) => ({ path })), [resolvedFiles]);

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      {/* TODO(burdon): Add toolbar actions (cf. SpecArticle's Editor.Toolbar). */}
      <Panel.Toolbar asChild>
        <Toolbar.Root></Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <div className='dx-container grid grid-cols-[30rem_1fr] divide-x divide-separator' role='none'>
          <div className='dx-container grid grid-rows-[1fr_2fr] divide-y divide-separator'>
            <div role='region' aria-label={t('browse-pane.label')} className='dx-container grid overflow-auto'>
              <FileTree
                files={fileEntries}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                emptyMessage={t('view.code.empty.placeholder')}
              />
            </div>
            <div role='region' aria-label={t('inspect-pane.label')} className='dx-container grid p-2 overflow-auto'>
              {/* TODO(burdon): Inspector / spec editor for the selected item. */}
            </div>
          </div>
          <div role='region' aria-label={t('output-pane.label')} className='dx-container grid min-bs-0 overflow-hidden'>
            {selected ? <FileEditor file={selected} role={role} /> : null}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
});

type FileEditorProps = {
  file: SourceFile.SourceFile;
  role?: string;
};

const FileEditor = ({ file, role }: FileEditorProps) => {
  const { themeMode } = useThemeContext();
  const identity = useIdentity();
  const space = getSpace(file);

  // Trigger re-render when content ref resolves.
  useObject(file.content);
  const target = file.content.target;

  const extensions = useMemo(
    () =>
      [
        createBasicExtensions({ lineNumbers: true, lineWrapping: false }),
        createThemeExtensions({ themeMode, slots: documentSlots, monospace: true, syntaxHighlighting: true }),
        languageForPath(file.path),
        target &&
          createDataExtensions({
            id: file.id,
            text: createDocAccessor(target, ['content']),
            messenger: space,
            identity,
          }),
      ].filter(isTruthy),
    [identity, space, file.id, file.path, target, themeMode],
  );

  if (!target) {
    return null;
  }

  return (
    <Editor.Root extensions={extensions}>
      <Editor.View classNames={editorClassNames(role)} />
    </Editor.Root>
  );
};
