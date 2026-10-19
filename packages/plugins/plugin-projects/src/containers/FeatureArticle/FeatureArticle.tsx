//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { Form } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';
import { Feature } from '#types';

import { FeatureCardBody, getDependents } from '../../components/FeatureCard/index.ts';
import { useFeatureGraph, useOpenObject } from '../../hooks/index.ts';

// The editable fields, picked from the schema on the AST as ProjectArticle does: `Type.getSchema` erases to
// `Codec`, so the field types are re-attached here.
type Values = Pick<Feature.Feature, 'name' | 'description' | 'status' | 'specs' | 'subfeatures'>;

const Values = Schema.make<Schema.Codec<Values, any>>(
  SchemaAST.pick(Type.getSchema(Feature.Feature).ast, ['name', 'description', 'status', 'specs', 'subfeatures']),
);

export type FeatureArticleProps = AppSurface.ObjectArticleProps<Feature.Feature>;

/**
 * Article surface for a {@link Feature.Feature}: its fields as a form, then what it depends on, what depends
 * on it, its subfeatures, the tasks working toward it and the showcases that demonstrate it. Listed
 * features, tasks and showcases open beside it.
 */
export const FeatureArticle = ({ role, subject, attendableId }: FeatureArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [, updateFeature] = useObject(subject);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const feature = graph.lookup(subject.id);
  const dependents = useMemo(
    () => getDependents(subject.id, graph.features).flatMap((id) => graph.lookup(id) ?? []),
    [subject.id, graph],
  );
  const openObject = useOpenObject(db, attendableId);

  // Read once per feature; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<Values>>(
    () => ({
      name: subject.name,
      description: subject.description,
      status: subject.status,
      specs: subject.specs,
      subfeatures: subject.subfeatures,
    }),
    [subject],
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
        <Form.Root db={db} schema={Values} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
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
                      dependents={dependents}
                      onSelectDependency={(id) => void openObject(id)}
                      onOpenObject={(id) => void openObject(id)}
                    />
                  </Card.Root>
                </Form.FieldSet>
              )}
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
