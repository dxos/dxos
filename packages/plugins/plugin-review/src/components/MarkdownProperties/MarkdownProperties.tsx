//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Version } from '@dxos/versioning';

import { useVersioning } from '../../hooks';
import { meta } from '../../meta';

export type MarkdownPropertiesProps = AppSurface.ObjectPropertiesProps<Markdown.Document>;

/**
 * Compact "Versions" summary contributed to the shared Properties companion.
 * The full manager lives in the History companion tab.
 */
export const MarkdownProperties = ({ subject }: MarkdownPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const versioning = useVersioning(subject);
  const { document, history, selection, activeBranch } = versioning;

  const handleCheckpoint = useCallback(() => {
    const target = document?.content.target;
    if (document && target) {
      Version.create(document, { name: '', target });
    }
  }, [document]);

  if (!document) {
    return null;
  }

  const branchCount = (history?.branches ?? []).filter((branch) => branch.status === 'active').length;
  const versionCount = history?.versions.length ?? 0;
  const currentLabel = selection.kind === 'branch' && activeBranch ? activeBranch.name : t('main-branch.label');

  return (
    <Form.Section title={t('versions.title')}>
      {/* `standalone` labels nothing focusable, so it renders a span rather than an orphan <label>. */}
      <Form.Label
        standalone
        label={currentLabel}
        labelEnd={
          <span className='shrink-0 text-xs text-description'>
            {t('branch-count.label', { count: branchCount })} · {t('checkpoint-count.label', { count: versionCount })}
          </span>
        }
      />
      <div className='flex gap-1'>
        <IconButton
          icon='ph--bookmark-simple--regular'
          label={t('create-checkpoint.label')}
          onClick={handleCheckpoint}
        />
      </div>
    </Form.Section>
  );
};

MarkdownProperties.displayName = 'MarkdownProperties';
