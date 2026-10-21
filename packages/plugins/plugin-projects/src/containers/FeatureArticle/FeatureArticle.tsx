//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Type } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { Form, type FormFieldMap, type FormFieldRenderer } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { Feature } from '#types';

import { FeatureCardBody, SubfeatureEditor, getDependents } from '../../components/FeatureCard/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenObject, useOpenSpec } from '../../hooks/index.ts';

// The editable fields, picked from the schema on the AST as ProjectArticle does: `Type.getSchema` erases to
// `Codec`, so the field types are re-attached here.
type Values = Pick<Feature.Feature, 'name' | 'description' | 'status' | 'specs' | 'subfeatures'>;

const Values = Schema.make<Schema.Codec<Values, any>>(
  SchemaAST.pick(Type.getSchema(Feature.Feature).ast, ['name', 'description', 'status', 'specs', 'subfeatures']),
);

/** Subfeatures render as the card's rows rather than the generic list of nested forms. */
const SubfeaturesField: FormFieldRenderer = ({ type, label, getValue, onValueChange }) => (
  <Form.Field label={label} standalone>
    <SubfeatureEditor subfeatures={getValue() ?? []} onChange={(subfeatures) => onValueChange(type, subfeatures)} />
  </Form.Field>
);

const FIELD_MAP: FormFieldMap = { subfeatures: SubfeaturesField };

export type FeatureArticleProps = AppSurface.ObjectArticleProps<Feature.Feature>;

/**
 * Article surface for a {@link Feature.Feature}: its fields as a form, then what it depends on, what depends
 * on it, its subfeatures, the tasks working toward it and the showcases that demonstrate it. Listed
 * features, tasks and showcases open beside it.
 */
export const FeatureArticle = ({ role, subject, attendableId }: FeatureArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [snapshot, updateFeature] = useObject(subject);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const feature = graph.lookup(subject.id);
  const dependents = useMemo(
    () => getDependents(subject.id, graph.features).flatMap((id) => graph.lookup(id) ?? []),
    [subject.id, graph],
  );
  const openObject = useOpenObject(db, attendableId);
  const openSpec = useOpenSpec();
  const editing = useFeatureEditing(db);
  // A feature cannot depend on itself; the operation refuses longer cycles with their path.
  const excludedDependencies = useMemo(() => [subject.id, ...(feature?.dependsOn ?? [])], [subject.id, feature]);
  // Filing needs somewhere to file into: the project the feature belongs to, and its task set.
  const project = useResolveRef(snapshot?.project);
  const canFileTask = !!project?.taskSet;
  const handleFileTask = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const title = input.value.trim();
      if (event.key !== 'Enter' || !title) {
        return;
      }
      input.value = '';
      void editing.fileTask(subject.id, title);
    },
    [editing, subject.id],
  );
  const linkedTasks = useMemo(() => feature?.tasks.map((task) => task.id) ?? [], [feature]);

  // Bound to the live feature, so a status set from a card icon (or by an agent) reaches the open form.
  const values = useMemo<Partial<Values>>(
    () => ({
      name: snapshot?.name,
      description: snapshot?.description,
      status: snapshot?.status,
      specs: snapshot?.specs,
      subfeatures: snapshot?.subfeatures,
    }),
    [snapshot],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<Values>) =>
      updateFeature((feature) => {
        if (values.name !== undefined) {
          feature.name = values.name;
        }
        feature.description = values.description;
        if (values.status !== undefined) {
          feature.status = values.status;
        }
        feature.specs = values.specs && [...values.specs];
        feature.subfeatures = values.subfeatures?.map((subfeature) => ({ ...subfeature }));
      }),
    [updateFeature],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <Form.Root db={db} schema={Values} values={values} fieldMap={FIELD_MAP} onValuesChanged={handleValuesChanged}>
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Fields />
              {feature && (
                <Form.FieldSet label={t('feature-article.relations.label')}>
                  <Card.Root grid border={false} data-testid='feature-article.relations'>
                    <FeatureCardBody
                      feature={feature}
                      lookup={graph.lookup}
                      expanded
                      showFields={false}
                      showSubfeatures={false}
                      dependents={dependents}
                      onSelectDependency={(id) => void openObject(id)}
                      onRemoveDependency={(id) => editing.removeDependency(subject.id, id)}
                      onOpenObject={(id) => void openObject(id)}
                      openSpec={openSpec}
                    />
                  </Card.Root>
                  {canFileTask && (
                    <Input.Root
                      placeholder={t('feature-article.file-task.placeholder')}
                      aria-label={t('feature-article.file-task.placeholder')}
                      data-testid='feature-article.file-task'
                      onKeyDown={handleFileTask}
                    />
                  )}
                  <Layout.Flex wrap gap='xs'>
                    <ObjectAddPicker
                      db={db}
                      filter={Filter.type(Feature.Feature)}
                      exclude={excludedDependencies}
                      onSelect={(id) => editing.addDependency(subject.id, id)}
                      trigger={
                        <Button.Root icon='ph--arrow-right--regular' data-testid='feature-article.add-dependency'>
                          {t('feature-article.add-dependency.label')}
                        </Button.Root>
                      }
                    />
                    <ObjectAddPicker
                      db={db}
                      filter={Filter.type(Task.Task)}
                      exclude={linkedTasks}
                      onSelect={(id) => editing.linkTask(id, subject.id)}
                      trigger={
                        <Button.Root icon='ph--check-square--regular' data-testid='feature-article.link-task'>
                          {t('feature-article.link-task.label')}
                        </Button.Root>
                      }
                    />
                  </Layout.Flex>
                </Form.FieldSet>
              )}
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
