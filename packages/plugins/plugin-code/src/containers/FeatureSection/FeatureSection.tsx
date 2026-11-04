//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, EID, Filter, Obj, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Form, type FormFieldOverride, ObjectMultiPicker, type RefOption } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';

import { CodeCapabilities, Feature } from '#types';

import { type FeatureLookup, RequirementEditor, RequirementId, RowIcon } from '../../components/FeatureCard/index.ts';
import { useFeatureEditing, useFeatureGraph } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { FeatureValues, useFeatureValues } from '../FeatureArticle/index.ts';

const entityId = (uri: string) => EID.getEntityId(EID.parse(uri)) ?? uri;

export type FeatureSectionProps = {
  subject: Feature.Feature;
  /** Whether the host gives the section attention; until it does, empty fields and the add actions hide. */
  attended?: boolean;
};

/**
 * What a feature's spec block says, edited in place where the feature is embedded: a header row of its block id, name
 * and status, then its description, requirements and the features it needs. Icons sit in the card's start rail, so
 * every text starts at one edge. Folded, only the header row shows, with the requirement count and the needed
 * features. Its card is the read-only version; the rest of how it relates (dependents, tasks, showcases) is in its
 * article and the companion.
 */
export const FeatureSection = ({ subject, attended = true }: FeatureSectionProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const { values, onValuesChanged } = useFeatureValues(subject);
  // Read through the object, so a block id set by an import shows without a remount.
  const [snapshot] = useObject(subject);
  const blockId = snapshot && Feature.getBlockId(snapshot);
  const db = Obj.getDatabase(subject);
  const graph = useFeatureGraph(db, [subject.id], { neighbours: true });
  const feature = graph.lookup(subject.id);
  const dependsOn = useMemo(() => feature?.dependsOn ?? [], [feature]);
  const editing = useFeatureEditing(db);
  const [collapsed, setCollapsed] = useCollapsed(subject.id);
  const options = useDependencyOptions(db, subject.id, dependsOn, graph.lookup, attended);
  const requirements = values.requirements ?? [];

  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      name: { presentation: 'title' },
      // A status once picked is never cleared, so the pill offers no "None".
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
                <Layout.Flex align='center' gap='sm'>
                  {collapsed && requirements.length > 0 && (
                    <Card.Text variant='muted' data-testid='feature-section.requirement-count'>
                      {t('feature-section.requirement-count.label', { count: requirements.length })}
                    </Card.Text>
                  )}
                  <Form.Fields include={['status']} layout='pill' />
                </Layout.Flex>
              }
            >
              <Layout.Flex align='center' gap='sm'>
                {blockId && (
                  <span data-testid='feature-section.block-id'>
                    <RequirementId id={blockId} />
                  </span>
                )}
                <Layout.Flex column grow>
                  <Form.Fields include={['name']} />
                </Layout.Flex>
                {collapsed &&
                  dependsOn.map((id) => (
                    <Tag.Tag key={id} data-testid='feature-section.dependency'>
                      {graph.lookup(id)?.name ?? id}
                    </Tag.Tag>
                  ))}
              </Layout.Flex>
            </Card.Row>
            {!collapsed && (
              <>
                {(attended || values.description) && (
                  <Card.Row>
                    <Form.Fields include={['description']} />
                  </Card.Row>
                )}
                <RequirementEditor
                  requirements={requirements}
                  variant='plain'
                  actions={attended}
                  onChange={(requirements) => onValuesChanged({ ...values, requirements })}
                />
                {(attended || dependsOn.length > 0) && (
                  <Card.Row
                    leading={<RowIcon icon='ph--arrow-right--regular' />}
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

/** Whether the feature's section is folded; kept on this device, since one reader folding a section is not an edit. */
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
 * The features the picker offers: every feature this one may depend on, which excludes itself and the features that
 * depend on it directly or through others, so no pick closes a cycle. Queried only while attended, as the picker only
 * opens then; until then the options are the current dependencies, which name the chips.
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
