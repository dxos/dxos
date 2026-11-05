//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, EID, Filter, Obj, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useAttention } from '@dxos/react-ui-attention';
import { Form, type FormFieldOverride, ObjectMultiPicker, type RefOption } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';

import { CodeCapabilities, Feature } from '#types';

import { type FeatureLookup, RequirementEditor, RequirementId, RowIcon } from '../../components/FeatureCard/index.ts';
import { useFeatureEditing, useFeatureGraph, useRequirementVerdicts } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { FeatureValues, useFeatureValues } from '../FeatureArticle/index.ts';

const entityId = (uri: string) => EID.getEntityId(EID.parse(uri)) ?? uri;

export type FeatureSectionProps = {
  subject: Feature.Feature;
  /**
   * The attendable id of the embed the section is drawn in. Until it has attention, all but the fold toggle is inert,
   * and empty fields and the add actions hide.
   */
  attendableId?: string;
};

/**
 * A feature's spec block, edited in place where the feature is embedded; folded, only its header row shows. Its card
 * is the read-only version; dependents, tasks and showcases are in its article and the companion.
 */
export const FeatureSection = ({ subject, attendableId }: FeatureSectionProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const { hasAttention } = useAttention(attendableId);
  const attended = !attendableId || hasAttention;
  const { values, onValuesChanged } = useFeatureValues(subject);
  // Read through the object, so a block id set by an import shows without a remount.
  const [snapshot] = useObject(subject);
  const blockId = snapshot && Feature.getBlockId(snapshot);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const verdicts = useRequirementVerdicts(subject);
  const feature = graph.lookup(subject.id);
  const dependsOn = useMemo(() => feature?.dependsOn ?? [], [feature]);
  const editing = useFeatureEditing(db);
  const [collapsed, setCollapsed] = useCollapsed(subject.id);
  const options = useDependencyOptions(db, subject.id, dependsOn, graph.lookup, attended);
  const requirements = snapshot ? Feature.getRequirements(snapshot) : [];
  const inert = attended ? undefined : true;

  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      name: { presentation: 'title' },
      // A status once picked is never cleared, so the tag offers no "None".
      status: { required: true },
      // The schema's guidance wraps at a section's width; the placeholder is one line.
      description: {
        presentation: 'plain',
        hideLabel: true,
        placeholder: t('feature-section.description.placeholder'),
      },
    }),
    [t],
  );

  const handleDependenciesChange = useCallback(
    (ids: string[]) => {
      ids.filter((id) => !dependsOn.includes(id)).forEach((id) => editing.addDependency(subject.id, id));
      dependsOn.filter((id) => !ids.includes(id)).forEach((id) => editing.removeDependency(subject.id, id));
    },
    [subject.id, dependsOn, editing],
  );

  return (
    <Form.Root
      db={db}
      object={subject}
      schema={FeatureValues}
      values={values}
      fieldOverrides={fieldOverrides}
      onValuesChanged={onValuesChanged}
    >
      <Form.Viewport gutter='none'>
        <Form.Content>
          <Card.Root grid border={false}>
            <Card.Row
              leading={
                <SystemButton.Disclosure
                  variant='ghost'
                  label={t('feature-section.collapse.label')}
                  expanded={!collapsed}
                  onExpandedChange={(expanded) => setCollapsed(!expanded)}
                  data-testid='feature-section.collapse'
                />
              }
              trailing={
                <Layout.Flex asChild align='center' gap='sm'>
                  <div inert={inert}>
                    {collapsed &&
                      dependsOn.map((id) => {
                        const dependency = graph.lookup(id);
                        return (
                          <Tag.Tag key={id} title={dependency?.name} data-testid='feature-section.dependency'>
                            {dependency?.blockId ?? dependency?.name ?? id}
                          </Tag.Tag>
                        );
                      })}
                    {collapsed && requirements.length > 0 && (
                      <Card.Text variant='muted' data-testid='feature-section.requirement-count'>
                        {t('feature-section.requirement-count.label', { count: requirements.length })}
                      </Card.Text>
                    )}
                    <Form.Fields include={['status']} layout='tag' />
                  </div>
                </Layout.Flex>
              }
            >
              <Layout.Flex asChild align='center' gap='sm'>
                <div inert={inert}>
                  {blockId && (
                    <span data-testid='feature-section.block-id'>
                      <RequirementId id={blockId} />
                    </span>
                  )}
                  <Layout.Flex column grow>
                    <Form.Fields include={['name']} />
                  </Layout.Flex>
                </div>
              </Layout.Flex>
            </Card.Row>
            {!collapsed && (
              <>
                {(attended || values.description) && (
                  <Card.Row inert={inert}>
                    <Form.Fields include={['description']} />
                  </Card.Row>
                )}
                <RequirementEditor
                  feature={subject}
                  variant='plain'
                  actions={attended}
                  inert={inert}
                  verdicts={verdicts}
                />
                {(attended || dependsOn.length > 0) && (
                  <Card.Row
                    leading={<RowIcon icon='ph--arrow-right--regular' />}
                    inert={inert}
                    data-testid='feature-section.dependencies'
                  >
                    <ObjectMultiPicker
                      value={[...dependsOn]}
                      options={options}
                      placeholder={t('feature-section.dependencies.placeholder')}
                      data-testid='feature-section.dependency-picker'
                      onValueChange={handleDependenciesChange}
                    />
                  </Card.Row>
                )}
              </>
            )}
          </Card.Root>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const useCollapsed = (id: string) => {
  const [state, updateState] = Hooks.useAtomCapabilityState(CodeCapabilities.State);
  const collapsed = state.collapsed?.[id] ?? false;
  const setCollapsed = useCallback(
    (next: boolean) =>
      updateState(({ collapsed: { [id]: _, ...rest } = {}, ...state }) => ({
        ...state,
        collapsed: next ? { ...rest, [id]: true } : rest,
      })),
    [id, updateState],
  );
  return [collapsed, setCollapsed] as const;
};

/**
 * Every feature this one may depend on without closing a cycle, plus its current dependencies, which name the chips.
 * Queried only while attended, since the picker opens only then.
 */
const useDependencyOptions = (
  db: Database.Database | undefined,
  id: string,
  dependsOn: readonly string[],
  lookup: FeatureLookup,
  attended: boolean,
): RefOption[] => {
  const features = useQuery(attended ? db : undefined, Filter.type(Feature.Feature));
  const relations = useQuery(attended ? db : undefined, Filter.type(Feature.DependsOn));
  return useMemo(() => {
    const edges = relations.map(
      (relation) => [entityId(Relation.getSourceURI(relation)), entityId(Relation.getTargetURI(relation))] as const,
    );
    const candidates = features
      .filter((feature) => !Feature.findDependencyCycle(edges, id, feature.id))
      .map((feature) => ({ id: feature.id, label: feature.name }));
    const current = dependsOn.map((dependency) => ({ id: dependency, label: lookup(dependency)?.name ?? dependency }));
    return [...new Map([...current, ...candidates].map((option) => [option.id, option])).values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [features, relations, id, dependsOn, lookup]);
};
