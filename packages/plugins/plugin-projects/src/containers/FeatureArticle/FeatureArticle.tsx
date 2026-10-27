//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { DXN, Filter, Obj, Type } from '@dxos/echo';
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

import { FeatureCard, SubfeatureEditor, getDependents } from '../../components/FeatureCard/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenFeatureTarget } from '../../hooks/index.ts';

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
  const handleOpen = useOpenFeatureTarget(db, attendableId);
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
  const handleSetKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const key = event.currentTarget.value.trim();
      if (event.key !== 'Enter' || !Schema.is(DXN.NameSchema)(key)) {
        return;
      }
      updateFeature((feature) => {
        Obj.getMeta(feature).key = key;
      });
    },
    [updateFeature],
  );

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
                  {/* The form edits the description, specs and subfeatures, so the card shows only relations. */}
                  <FeatureCard.Provider feature={feature} lookup={graph.lookup} onOpen={handleOpen}>
                    <Card.Root grid border={false} data-testid='feature-article.relations'>
                      <FeatureCard.Body>
                        <FeatureCard.Link />
                        <FeatureCard.Tags all />
                        <FeatureCard.TaskCount />
                        <FeatureCard.Dependencies onRemove={(id) => editing.removeDependency(subject.id, id)} />
                        <FeatureCard.Dependents dependents={dependents} />
                        <FeatureCard.Tasks />
                        <FeatureCard.Showcases />
                        <FeatureCard.Specs />
                        <FeatureCard.Code />
                      </FeatureCard.Body>
                    </Card.Root>
                  </FeatureCard.Provider>
                  {!feature.link && (
                    <Input.Root
                      placeholder={t('feature-article.set-key.placeholder')}
                      aria-label={t('feature-article.set-key.placeholder')}
                      data-testid='feature-article.set-key'
                      onKeyDown={handleSetKey}
                    />
                  )}
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
