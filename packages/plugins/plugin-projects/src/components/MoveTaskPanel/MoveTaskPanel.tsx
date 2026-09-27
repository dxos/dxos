//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';

export type MoveTaskPanelProps = {
  /** Candidate destinations; the caller excludes the task's own project. */
  projects: readonly Project.Project[];
  onSelect: (project: Project.Project) => void;
};

/** A searchable list of destination projects for a task's "Move to…" action. */
export const MoveTaskPanel = ({ projects, onSelect }: MoveTaskPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sorted = useMemo(
    () => [...projects].sort((left, right) => label(left).localeCompare(label(right))),
    [projects],
  );
  const { results, handleSearch } = useSearchListResults({ items: sorted, extract: label });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Input autoFocus data-testid='move-task-panel.input' placeholder={t('move-task.placeholder')} />
      <SearchList.Viewport padding={false}>
        {results.map((project) => (
          <SearchList.Item
            key={project.id}
            value={project.id}
            label={label(project) || t('untitled-project.label')}
            icon='ph--check-square-offset--regular'
            onSelect={() => onSelect(project)}
          />
        ))}
      </SearchList.Viewport>
      {sorted.length === 0 && (
        <p className='p-form-padding text-description' data-testid='move-task-panel.empty'>
          {t('move-task-empty.message')}
        </p>
      )}
    </SearchList.Root>
  );
};

const label = (project: Project.Project): string => Obj.getLabel(project) ?? '';
