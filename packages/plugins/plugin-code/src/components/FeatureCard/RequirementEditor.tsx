//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { BoundTextEditor } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { type Feature } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import * as FeatureAnchor from '../../util/feature-anchor.ts';
import { RequirementIcon, RequirementId, RowIcon } from './fields.tsx';

export type RequirementEditorProps = {
  /** The live feature, whose requirement texts the rows edit in place. */
  feature: Feature.Feature;
  /** Its requirements as rendered, so the rows follow edits from elsewhere. */
  requirements: readonly Feature.Requirement[];
  onAdd: () => void;
  onRemove: (index: number) => void;
};

/**
 * A feature's requirements, each an editor bound to its text that wraps to the whole of it, with the spec id it came
 * from before it and a remove action after. Typing edits the requirement in place, so comments on it stay anchored;
 * comment marks reach the editors through `EditorExtensionsProvider`, by the requirement's hidden key.
 */
export const RequirementEditor = ({ feature, requirements, onAdd, onRemove }: RequirementEditorProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  // The row just added takes focus, so a new requirement is written before anything else.
  const [focusIndex, setFocusIndex] = useState<number>();
  return (
    <Card.Root grid border={false} data-testid='requirement-editor'>
      {requirements.map((requirement, index) => (
        <Card.Row
          key={requirement.key ?? index}
          // The column's content clips overflow (for truncation), which would cut off the field's box.
          classNames='[&_.dx-card-row-content]:overflow-visible'
          leading={<RequirementIcon />}
          trailing={
            <Card.Action
              icon='ph--x--regular'
              label={t('requirement-editor.remove.label')}
              data-testid={`requirement-editor.${index}.remove`}
              onClick={() => onRemove(index)}
            />
          }
        >
          {/* The spec id leads the text, as it does in the read-only list; the field takes the rest of the row. */}
          <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
            {requirement.id && <RequirementId id={requirement.id} />}
            <div className='grow min-w-0'>
              <BoundTextEditor
                binding={{
                  object: feature,
                  path: ['requirements', index, 'text'],
                  anchor: requirement.key
                    ? FeatureAnchor.getPath({ field: 'requirement', key: requirement.key })
                    : undefined,
                }}
                placeholder={t('requirement-editor.text.label')}
                autoFocus={index === focusIndex}
                testId={`requirement-editor.${index}.text`}
              />
            </div>
          </Layout.Flex>
        </Card.Row>
      ))}
      <Card.Row
        leading={<RowIcon icon='ph--plus--regular' />}
        data-testid='requirement-editor.add'
        onClick={() => {
          setFocusIndex(requirements.length);
          onAdd();
        }}
      >
        <Card.Text variant='muted'>{t('requirement-editor.add.label')}</Card.Text>
      </Card.Row>
    </Card.Root>
  );
};
