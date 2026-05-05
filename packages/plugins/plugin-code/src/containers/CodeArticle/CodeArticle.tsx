//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type CodeProject } from '#types';

export type CodeArticleProps = AppSurface.ObjectArticleProps<CodeProject.CodeProject>;

// Three-pane layout mirroring `react-ui-introspect`'s `ToolsExplorer`:
//
//   ┌───────────┬─────────────────┐
//   │  Browse   │                 │
//   │  (list)   │     Output      │
//   ├───────────┤  (preview/run)  │
//   │  Inspect  │                 │
//   │  (form)   │                 │
//   └───────────┴─────────────────┘
//
// 30rem fixed left column, 1fr right; left split 1:2 vertically. Same
// `dx-container grid` + `divide-x`/`divide-y separator` idiom as the
// introspect explorer so the visual rhythm matches across panels.

export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(({ role }, forwardedRef) => {
  const { t } = useTranslation(meta.id);

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      {/* TODO(burdon): Custom toolbar. */}
      <Panel.Toolbar />
      <Panel.Content asChild>
        <div role='none' className='dx-container grid grid-cols-[30rem_1fr] divide-x divide-separator'>
          <div className='dx-container grid grid-rows-[1fr_2fr] divide-y divide-separator'>
            <div role='region' aria-label={t('browse-pane.label')} className='dx-container grid p-2 overflow-auto'>
              {/* TODO(burdon): Spec / source list. */}
              <div className='text-description text-sm'>{t('view.code.placeholder')}</div>
            </div>
            <div role='region' aria-label={t('inspect-pane.label')} className='dx-container grid p-2 overflow-auto'>
              {/* TODO(burdon): Inspector / spec editor for the selected item. */}
            </div>
          </div>
          <div role='region' aria-label={t('output-pane.label')} className='dx-container grid overflow-auto'>
            {/* TODO(burdon): Code preview / run output. */}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
});
