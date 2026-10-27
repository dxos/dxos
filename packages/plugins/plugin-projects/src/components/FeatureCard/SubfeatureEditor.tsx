//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { type Feature } from '#types';

import { ProjectsNamespace } from '../../namespace.ts';
import { EditField, RowIcon, StatusIcon } from './fields.tsx';

export type SubfeatureEditorProps = {
  subfeatures: readonly Feature.Subfeature[];
  onChange: (subfeatures: Feature.Subfeature[]) => void;
};

/**
 * Subfeatures as the card lists them, editable in place: the status icon picks a status, the name is a field, and each
 * row removes itself. Every edit hands back the whole list, since subfeatures are records inside their feature.
 */
export const SubfeatureEditor = ({ subfeatures, onChange }: SubfeatureEditorProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  // The row just added takes focus, so a new subfeature is named before anything else.
  const [focusIndex, setFocusIndex] = useState<number>();
  const update = (index: number, patch: Partial<Feature.Subfeature>) =>
    onChange(subfeatures.map((subfeature, candidate) => ({ ...subfeature, ...(candidate === index ? patch : {}) })));
  return (
    <Card.Root grid border={false} data-testid='subfeature-editor'>
      {subfeatures.map((subfeature, index) => (
        <Card.Row
          key={index}
          leading={
            <StatusIcon
              status={subfeature.status}
              muted
              onChange={(status) => update(index, { status })}
              testId={`subfeature-editor.${index}.status`}
            />
          }
          trailing={
            <Layout.Flex gap='xs' classNames='items-center'>
              <Card.Text variant='muted'>{t(`feature-status.${subfeature.status}.label`)}</Card.Text>
              <Card.Action
                icon='ph--x--regular'
                label={t('subfeature-editor.remove.label', { name: subfeature.name })}
                data-testid={`subfeature-editor.${index}.remove`}
                onClick={() => onChange(subfeatures.filter((_, candidate) => candidate !== index))}
              />
            </Layout.Flex>
          }
        >
          <EditField
            value={subfeature.name}
            placeholder={t('subfeature-editor.name.placeholder')}
            label={t('subfeature-editor.name.label')}
            testId={`subfeature-editor.${index}.name`}
            autoFocus={index === focusIndex}
            subdued
            onCommit={(name) => update(index, { name })}
          />
        </Card.Row>
      ))}
      <Card.Row
        leading={<RowIcon icon='ph--plus--regular' />}
        data-testid='subfeature-editor.add'
        onClick={() => {
          setFocusIndex(subfeatures.length);
          onChange([...subfeatures.map((subfeature) => ({ ...subfeature })), { name: '', status: 'planned' }]);
        }}
      >
        <Card.Text variant='muted'>{t('subfeature-editor.add.label')}</Card.Text>
      </Card.Row>
    </Card.Root>
  );
};
