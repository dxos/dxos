//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { type ActionGraphProps, MenuBuilder } from '@dxos/react-ui-menu';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { meta } from '#meta';
import { CodeProject } from '#types';

import { mdl, mdlBlockDescription } from '../../extension';

type View = 'spec' | 'code';

export type CodeArticleProps = AppSurface.ObjectArticleProps<CodeProject.CodeProject>;

/**
 * Renders a CodeProject. Resolves the linked Spec and renders its mdl content
 * in a tabbed editor — the Code tab is a placeholder for build output until
 * the EDGE build service is wired up.
 */
export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(
  ({ role, subject: project, attendableId }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const identity = useIdentity();
    const space = getSpace(project);
    const [view, setView] = useState<View>('spec');

    // Resolve the linked Spec.
    useObject(project.spec);
    const spec = project.spec.target;
    useObject(spec?.content);
    const target = spec?.content.target;

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions(),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          target &&
            spec &&
            createDataExtensions({
              id: spec.id,
              text: createDocAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [identity, space, spec, target, themeMode],
    );

    const customActions = useMemo<Atom.Atom<ActionGraphProps>>(
      () =>
        Atom.make(() =>
          MenuBuilder.make()
            .action(
              'view-spec',
              {
                label: t('view.spec.label'),
                icon: 'ph--file-text--regular',
                disposition: 'toolbar',
                checked: view === 'spec',
              },
              () => setView('spec'),
            )
            .action(
              'view-code',
              {
                label: t('view.code.label'),
                icon: 'ph--code--regular',
                disposition: 'toolbar',
                checked: view === 'code',
              },
              () => setView('code'),
            )
            .build(),
        ),
      [t, view],
    );

    return (
      <Editor.Root extensions={extensions}>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar classNames='bg-toolbar-surface'>
            <Editor.Toolbar role={role} attendableId={attendableId} customActions={customActions} />
          </Panel.Toolbar>
          <Panel.Content asChild>
            {view === 'spec' ? (
              <Editor.View classNames={editorClassNames(role)} value={target?.content ?? ''} />
            ) : (
              <div role='none' className='flex items-center justify-center text-description p-4'>
                {t('view.code.placeholder')}
              </div>
            )}
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);
