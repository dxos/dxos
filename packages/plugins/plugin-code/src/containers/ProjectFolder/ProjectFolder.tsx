//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import type * as Project from '@dxos/compute/Project';
import { log } from '@dxos/log';
import { Button, Flex, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { CodeCapabilities } from '#types';

export type ProjectFolderProps = { project: Project.Project };

/**
 * The project's repository folder on this device, which coding agents work in. Kept in this plugin's
 * local state rather than on the project or in its settings, both of which sync: a path means nothing on
 * another device.
 */
export const ProjectFolder = ({ project }: ProjectFolderProps) => {
  const { t } = useTranslation(meta.profile.key);
  const registry = useCapability(Capabilities.AtomRegistry);
  const stateAtom = useCapability(CodeCapabilities.State);
  const folder = useAtomCapability(CodeCapabilities.State).repositories?.[project.id];

  const setFolder = useCallback(
    (folder: string | undefined) =>
      registry.update(stateAtom, ({ repositories = {}, ...state }) => {
        const { [project.id]: _, ...others } = repositories;
        return { ...state, repositories: folder ? { ...others, [project.id]: folder } : others };
      }),
    [project.id, registry, stateAtom],
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
    <Form.FieldSet label={t('project-folder.label')} description={t('project-folder.description')}>
      <Flex align='center' gap='sm' data-testid='codePlugin.projectFolder'>
        <span className='grow min-w-0 truncate font-mono text-sm' title={folder}>
          {folder ?? t('project-folder.empty.label')}
        </span>
        <Button onClick={handleChoose}>{t('project-folder.choose.label')}</Button>
        {folder && (
          <Button variant='ghost' onClick={() => setFolder(undefined)}>
            {t('project-folder.clear.label')}
          </Button>
        )}
      </Flex>
    </Form.FieldSet>
  );
};
