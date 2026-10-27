//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
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
import { Feature, Spec } from '#types';

import {
  FeatureCard,
  type FeatureTarget,
  RequirementEditor,
  getDependents,
} from '../../components/FeatureCard/index.ts';
import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { useFeatureEditing, useFeatureGraph, useOpenFeatureTarget } from '../../hooks/index.ts';

// The editable fields, picked from the schema on the AST as ProjectArticle does: `Type.getSchema` erases to
// `Codec`, so the field types are re-attached here.
type Values = Pick<Feature.Feature, 'name' | 'description' | 'status' | 'requirements'>;

const Values = Schema.make<Schema.Codec<Values, any>>(
  SchemaAST.pick(Type.getSchema(Feature.Feature).ast, ['name', 'description', 'status', 'requirements']),
);

/** Requirements render as rows that wrap to their whole text rather than the generic list of nested forms. */
const RequirementsField: FormFieldRenderer = ({ type, label, getValue, onValueChange }) => (
  <Form.Field label={label} standalone>
    <RequirementEditor requirements={getValue() ?? []} onChange={(requirements) => onValueChange(type, requirements)} />
  </Form.Field>
);

const FIELD_MAP: FormFieldMap = { requirements: RequirementsField };

export type FeatureDetailProps = {
  feature: Feature.Feature;
  attendableId?: string;
  /** Picks a subfeature, as the companion does by zooming the map to it; subfeatures open in a plank otherwise. */
  onSelectSubfeature?: (id: string) => void;
};

/**
 * One feature in full, in the order a reader new to it needs: what it is (name, the ideal it describes, its status),
 * what it must do (requirements), what it breaks down into (subfeatures), then how it relates to the rest — the
 * features it needs and that need it, the tasks working on it, the showcases proving it, and where it came from.
 */
export const FeatureDetail = ({ feature: subject, attendableId, onSelectSubfeature }: FeatureDetailProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [snapshot, updateFeature] = useObject(subject);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const feature = graph.lookup(subject.id);
  const dependents = useMemo(
    () => getDependents(subject.id, graph.features).flatMap((id) => graph.lookup(id) ?? []),
    [subject.id, graph],
  );
  const openTarget = useOpenFeatureTarget(db, attendableId);
  const handleOpen = useCallback(
    (target: FeatureTarget) => {
      const isSubfeature = target.type === 'object' && feature?.subfeatures.some(({ id }) => id === target.id);
      if (isSubfeature && onSelectSubfeature) {
        onSelectSubfeature(target.id);
      } else {
        openTarget(target);
      }
    },
    [feature, onSelectSubfeature, openTarget],
  );
  const editing = useFeatureEditing(db);
  // A feature cannot depend on itself; the operation refuses longer cycles with their path.
  const excludedDependencies = useMemo(() => [subject.id, ...(feature?.dependsOn ?? [])], [subject.id, feature]);
  // Filing needs somewhere to file into: the project tracking the feature's spec, and its task set. Read through each
  // spec's atom up the chain, so a project assigned while the article is open shows the filing input.
  const projectAtom = useMemo(
    () =>
      Atom.make((get) => {
        for (const spec of Spec.getAncestry(Spec.getContainer(subject))) {
          const { project } = get(Obj.atom(spec));
          if (project) {
            return project;
          }
        }
        return undefined;
      }),
    [subject],
  );
  const project = useResolveRef(useAtomValue(projectAtom));
  const canFileTask = !!project?.taskSet;
  const handleEnter = (action: (value: string) => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const value = input.value.trim();
    if (event.key !== 'Enter' || !value) {
      return;
    }
    input.value = '';
    action(value);
  };
  const linkedTasks = useMemo(() => feature?.tasks.map((task) => task.id) ?? [], [feature]);
  const handleSetKey = useCallback(
    (key: string) => {
      if (Schema.is(DXN.NameSchema)(key)) {
        updateFeature((feature) => {
          Obj.getMeta(feature).key = key;
        });
      }
    },
    [updateFeature],
  );

  // Bound to the live feature, so a status set by an agent (or a Kanban drop) reaches the open form.
  const values = useMemo<Partial<Values>>(
    () => ({
      name: snapshot?.name,
      description: snapshot?.description,
      status: snapshot?.status,
      requirements: snapshot?.requirements,
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
        feature.requirements = values.requirements?.map((requirement) => ({ ...requirement }));
      }),
    [updateFeature],
  );

  return (
    <Form.Root db={db} schema={Values} values={values} fieldMap={FIELD_MAP} onValuesChanged={handleValuesChanged}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Fields />
          {feature && (
            <FeatureCard.Provider feature={feature} lookup={graph.lookup} onOpen={handleOpen}>
              {/* The section titles itself, and the field alone says what it adds while there are none. */}
              <Form.FieldSet>
                {feature.subfeatures.length > 0 && (
                  <Card.Root grid border={false} data-testid='feature-article.subfeatures'>
                    <FeatureCard.Body>
                      <FeatureCard.Subfeatures />
                    </FeatureCard.Body>
                  </Card.Root>
                )}
                <Input.Root
                  placeholder={t('feature-article.add-subfeature.placeholder')}
                  aria-label={t('feature-article.add-subfeature.placeholder')}
                  data-testid='feature-article.add-subfeature'
                  onKeyDown={handleEnter((name) => void editing.createFeature(name, subject.id))}
                />
              </Form.FieldSet>
              <Form.FieldSet label={t('feature-article.relations.label')}>
                <Card.Root grid border={false} data-testid='feature-article.relations'>
                  <FeatureCard.Body>
                    <FeatureCard.Tags all />
                    <FeatureCard.Dependencies onRemove={(id) => editing.removeDependency(subject.id, id)} />
                    <FeatureCard.Dependents dependents={dependents} />
                    <FeatureCard.Tasks />
                    <FeatureCard.Showcases />
                    <FeatureCard.Specs />
                    <FeatureCard.Link />
                    <FeatureCard.Code />
                  </FeatureCard.Body>
                </Card.Root>
                {!feature.link && (
                  <Input.Root
                    placeholder={t('feature-article.set-key.placeholder')}
                    aria-label={t('feature-article.set-key.placeholder')}
                    data-testid='feature-article.set-key'
                    onKeyDown={handleEnter(handleSetKey)}
                  />
                )}
                {canFileTask && (
                  <Input.Root
                    placeholder={t('feature-article.file-task.placeholder')}
                    aria-label={t('feature-article.file-task.placeholder')}
                    data-testid='feature-article.file-task'
                    onKeyDown={handleEnter((title) => void editing.fileTask(subject.id, title))}
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
            </FeatureCard.Provider>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

export type FeatureArticleProps = AppSurface.ObjectArticleProps<Feature.Feature>;

/** Article surface for a {@link Feature.Feature}: its {@link FeatureDetail}, opened in a plank of its own. */
export const FeatureArticle = ({ role, subject, attendableId }: FeatureArticleProps) => (
  <Panel.Root role={role}>
    <Panel.Body>
      <FeatureDetail feature={subject} attendableId={attendableId} />
    </Panel.Body>
  </Panel.Root>
);
