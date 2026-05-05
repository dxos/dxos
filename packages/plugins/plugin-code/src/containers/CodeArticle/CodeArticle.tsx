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
import { Panel, useThemeContext, useTranslation } from '@dxos/react-ui';
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

export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(({ role, subject: project }, forwardedRef) => {
  const { t } = useTranslation(meta.id);

  // Trigger re-render on files mutations.
  useObject(project);
  const fileRefs = project.files ?? [];

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

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      <Panel.Toolbar />
      <Panel.Content asChild>
        <div role='none' className='grid grid-cols-[16rem_1fr] min-bs-0 bs-full overflow-hidden'>
          <div role='none' className='border-ie border-separator overflow-auto'>
            <FileTree
              files={resolvedFiles.map(({ path }) => ({ path }))}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              emptyMessage={t('view.code.empty.placeholder')}
            />
          </div>
          <div role='none' className='min-bs-0 overflow-hidden'>
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
