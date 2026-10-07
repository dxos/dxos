//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { Version } from '@dxos/versioning';

import { useVersioning } from '#hooks';
import { meta } from '#meta';

export type MarkdownPropertiesProps = AppSurface.ObjectPropertiesProps<Markdown.Document>;

/**
 * Compact "Versions" summary contributed to the shared Properties companion.
 * The full manager lives in the History companion tab.
 */
export const MarkdownProperties = ({ subject }: MarkdownPropertiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
    <Form.FieldSet label={t('versions.title')}>
      {/* `standalone` labels nothing focusable, so the label is text rather than an orphan <label>. */}
      <Form.Field
        standalone
        label={currentLabel}
        labelEnd={
          <span className='shrink-0 text-xs text-fg-muted'>
            {t('branch-count.label', { count: branchCount })} · {t('checkpoint-count.label', { count: versionCount })}
          </span>
        }
      >
        <div className='flex gap-1'>
          <Button.Root
            icon='ph--bookmark-simple--regular'
            label={t('create-checkpoint.label')}
            onClick={handleCheckpoint}
          />
        </div>
      </Form.Field>
    </Form.FieldSet>
  );
};

MarkdownProperties.displayName = 'MarkdownProperties';
