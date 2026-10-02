//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapability, useSettingsState } from '@dxos/app-framework/ui';
import type * as Project from '@dxos/compute/Project';
import { log } from '@dxos/log';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { CodeCapabilities, type Settings } from '#types';

export type ProjectFolderProps = { project: Project.Project };

/**
 * The project's repository folder on this device, which coding agents work in. Kept in this plugin's
 * settings rather than on the project, since a path means nothing on another device.
 */
export const ProjectFolder = ({ project }: ProjectFolderProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(useCapability(CodeCapabilities.Settings));
  const folder = settings.agentRepositories?.[project.id];

  const setFolder = useCallback(
    (folder: string | undefined) =>
      updateSettings(({ agentRepositories = {}, ...current }) => {
        const { [project.id]: _, ...others } = agentRepositories;
        return { ...current, agentRepositories: folder ? { ...others, [project.id]: folder } : others };
      }),
    [project.id, updateSettings],
  );

  const handleChoose = useCallback(() => {
    void import('@tauri-apps/plugin-dialog')
      .then(({ open }) => open({ directory: true, multiple: false, defaultPath: folder }))
      .then((selected) => {
        if (typeof selected === 'string') {
          setFolder(selected);
        }
      })
      .catch((error) => log.warn('folder picker failed', { error }));
  }, [folder, setFolder]);

  return (
    <Form.FieldSet
      label={t('project-folder.label')}
      description={t('project-folder.description')}
      descriptionPlacement='tooltip'
    >
      <div className='flex items-center gap-2' data-testid='codePlugin.projectFolder'>
        <span className='grow min-w-0 truncate font-mono text-sm' title={folder}>
          {folder ?? t('project-folder.empty.label')}
        </span>
        <Button onClick={handleChoose}>{t('project-folder.choose.label')}</Button>
        {folder && (
          <Button variant='ghost' onClick={() => setFolder(undefined)}>
            {t('project-folder.clear.label')}
          </Button>
        )}
      </div>
    </Form.FieldSet>
  );
};
