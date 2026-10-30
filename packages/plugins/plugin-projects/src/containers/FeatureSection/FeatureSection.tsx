//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';

import { Feature } from '#types';

import { FeatureCard, RequirementId } from '../../components/FeatureCard/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenFeatureTarget } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { FEATURE_FIELD_MAP, FeatureValues, useFeatureValues } from '../FeatureArticle/index.ts';

export type FeatureSectionProps = {
  subject: Feature.Feature;
  /** Where a dependency opens from. */
  attendableId?: string;
};

/**
 * What a feature's spec block says, edited in place where the feature is embedded: its block id, name, description,
 * requirements and status, and the features it depends on. Its card is the read-only version; the rest of how it
 * relates (dependents, tasks, showcases) is in its article and the companion.
 */
export const FeatureSection = ({ subject, attendableId }: FeatureSectionProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { values, onValuesChanged } = useFeatureValues(subject);
  // Read through the object, so a block id set by an import shows without a remount.
  const [snapshot] = useObject(subject);
  const blockId = snapshot && Feature.getBlockId(snapshot);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const feature = graph.lookup(subject.id);
  const openTarget = useOpenFeatureTarget(db, attendableId);
  const editing = useFeatureEditing(db);

  return (
    <Form.Root
      db={db}
      schema={FeatureValues}
      values={values}
      fieldMap={FEATURE_FIELD_MAP}
      onValuesChanged={onValuesChanged}
    >
      <div className='p-2'>
        {blockId && (
          <div className='px-1' data-testid='feature-section.block-id'>
            <RequirementId id={blockId} />
          </div>
        )}
        <Form.Content>
          <Form.Fields />
          {feature && (
            <Form.FieldSet>
              {feature.dependsOn.length > 0 && (
                <FeatureCard.Provider feature={feature} lookup={graph.lookup} onOpen={openTarget}>
                  <Card.Root grid border={false} data-testid='feature-section.dependencies'>
                    <FeatureCard.Body>
                      <FeatureCard.Dependencies onRemove={(id) => editing.removeDependency(subject.id, id)} />
                    </FeatureCard.Body>
                  </Card.Root>
                </FeatureCard.Provider>
              )}
              <ObjectAddPicker
                db={db}
                filter={Filter.type(Feature.Feature)}
                // A feature cannot depend on itself; the operation refuses longer cycles with their path.
                exclude={[subject.id, ...feature.dependsOn]}
                onSelect={(id) => editing.addDependency(subject.id, id)}
                trigger={
                  <Button.Root icon='ph--arrow-right--regular' data-testid='feature-section.add-dependency'>
                    {t('feature-article.add-dependency.label')}
                  </Button.Root>
                }
              />
            </Form.FieldSet>
          )}
        </Form.Content>
      </div>
    </Form.Root>
  );
};
