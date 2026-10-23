//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { type GraphModel, type LatticeSpec } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { LatticeGraph } from '../LatticeGraph/index.ts';
import {
  type DefinitionModel,
  KIND_GROUPS,
  type KindGroup,
  type ReviewModel,
  type SpecTexts,
  STATUS_STYLE,
  type VerdictStatus,
  buildDefinitionGraph,
  groupOf,
  hiddenKinds,
  kindStyle,
  reviewAnnotations,
  selectDefinitions,
  statusOf,
} from '../SpecModel/index.ts';

/** QA blocks name most of the design, so they start hidden to keep the design legible. */
const DEFAULT_GROUPS: Record<KindGroup, boolean> = { concepts: true, requirements: true, qa: false };

/** Short cards: a definition shows its kind, id and title, and its dependencies are the arrows. */
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 64, gutterY: 64 };

type DefinitionCardProps = {
  definition: DefinitionModel;
  dependents: number;
  status?: VerdictStatus;
};

const DefinitionCard = ({ definition, dependents, status }: DefinitionCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { icon, hue } = kindStyle(definition.kind);
  const { external } = definition;
  return (
    // An external node is outlined dashed, the convention the decision graph uses for what is not the person's own.
    <div
      className={mx('contents', external && '[&>*]:border-dashed [&>*]:border-2 [&>*]:border-accent-text')}
      title={external ? t('definition-graph.external.hint') : t('definition-graph.local.hint')}
    >
      <Card.Root
        data-testid='definition-graph.definition'
        data-definition={definition.id}
        data-kind={definition.kind}
        data-external={external?.target}
        data-status={status}
      >
        <Card.Header>
          <Layout.Block rail='start'>
            <Icon.Icon icon={icon} />
          </Layout.Block>
          <Card.Title truncate classNames='font-mono'>
            {external ? (external.fragment ?? definition.title) : definition.id}
          </Card.Title>
          {status && (
            <Layout.Block rail='end'>
              <Icon.Icon icon={STATUS_STYLE[status].icon} classNames={STATUS_TEXT[status]} />
            </Layout.Block>
          )}
        </Card.Header>
        <Card.Body>
          {external ? (
            <Card.Row>
              <Card.Text lines={1} classNames='font-mono text-xs text-description'>
                {external.key.path}
              </Card.Text>
            </Card.Row>
          ) : (
            definition.title && (
              <Card.Row>
                <Card.Text lines={1}>{definition.title}</Card.Text>
              </Card.Row>
            )
          )}
          <Card.Row>
            <Layout.Flex wrap gap='xs'>
              <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
              {status && <Tag.Tag hue={STATUS_STYLE[status].hue}>{STATUS_STYLE[status].label}</Tag.Tag>}
              {definition.dependsOn.length > 0 && (
                <Tag.Tag>{t('definition-graph.uses.label', { count: definition.dependsOn.length })}</Tag.Tag>
              )}
              {dependents > 0 && <Tag.Tag>{t('definition-graph.used-by.label', { count: dependents })}</Tag.Tag>}
            </Layout.Flex>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    </div>
  );
};

/** Status icon colours, matching the review gutter. */
const STATUS_TEXT: Record<VerdictStatus, string> = {
  done: 'text-success-text',
  untested: 'text-info-text',
  partial: 'text-warning-text',
  diverged: 'text-orange-text',
  missing: 'text-error-text',
};

type KindLegendProps = {
  /** Every kind in the spec, shown or not, so a hidden group still lists what it holds. */
  kinds: string[];
  groups: Record<KindGroup, boolean>;
  onGroupChange: (group: KindGroup, shown: boolean) => void;
  /** Absent when no annotation links the spec to code, so the switch is not offered. */
  code?: boolean;
  onCodeChange: (code: boolean) => void;
};

/** One switch per group, each beside the kinds it holds. */
const KindLegend = ({ kinds, groups, onGroupChange, code, onCodeChange }: KindLegendProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex
      column
      gap='xs'
      classNames='absolute top-2 start-2 z-10 p-2 rounded-sm bg-base-surface border border-separator'
      data-testid='definition-graph.legend'
    >
      {KIND_GROUPS.map((group) => (
        <Layout.Flex key={group} wrap gap='xs' classNames='items-center'>
          <Input.Switch
            checked={groups[group]}
            onCheckedChange={({ checked }) => onGroupChange(group, checked)}
            label={t(`definition-graph.group-${group}.label`)}
            data-testid={`definition-graph.group-${group}`}
          />
          {kinds
            .filter((kind) => groupOf(kind) === group && kind !== 'code')
            .map((kind) => (
              <Tag.Tag key={kind} hue={groups[group] ? kindStyle(kind).hue : 'neutral'}>
                <Icon.Icon icon={kindStyle(kind).icon} size='xs' />
                {kind}
              </Tag.Tag>
            ))}
        </Layout.Flex>
      ))}
      {code !== undefined && (
        <Input.Switch
          checked={code}
          onCheckedChange={({ checked }) => onCodeChange(checked)}
          label={t('definition-graph.code.label')}
          data-testid='definition-graph.code'
        />
      )}
    </Layout.Flex>
  );
};

export type DefinitionGraphProps = {
  /** The text of a `.mdl` spec. */
  content: string;
  /** Other specs this one names by `github:` key, so their blocks can be described. */
  specs?: SpecTexts;
  /** The latest compliance review; its verdicts badge the cards and its evidence adds the code boxes. */
  review?: ReviewModel;
  /** Block kinds to leave out. */
  exclude?: string[];
  /** Which groups of kinds start shown (concepts and requirements by default); the legend's switches change them. */
  defaultGroups?: Partial<Record<KindGroup, boolean>>;
  /** Double-click: an external node opens its spec or code; a local one is revealed in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * Every definition of a spec on a lattice, with an arrow from each to the definitions it names, so the
 * spec reads top-down from features to the types they rest on. Blocks of other specs the spec names by `github:` key,
 * and the code symbols the review links its items to, are drawn as dashed boxes.
 */
export const DefinitionGraph = ({
  content,
  specs,
  review,
  exclude = [],
  defaultGroups,
  onActivate,
}: DefinitionGraphProps) => {
  const [groups, setGroups] = useState<Record<KindGroup, boolean>>(() => ({ ...DEFAULT_GROUPS, ...defaultGroups }));
  const handleGroupChange = useCallback(
    (group: KindGroup, shown: boolean) => setGroups((groups) => ({ ...groups, [group]: shown })),
    [],
  );
  const [code, setCode] = useState(true);
  const annotations = useMemo(() => reviewAnnotations(review), [review]);
  const full = useMemo(() => buildDefinitionGraph(content, specs, annotations), [content, specs, annotations]);
  const allKinds = useMemo(() => [...new Set(full.definitions.map(({ kind }) => kind))], [full]);
  // A key rather than the array, so a caller passing a fresh literal each render does not re-lay out the graph.
  const excludeKey = [...exclude, ...hiddenKinds(allKinds, groups), ...(code ? [] : ['code'])].join(',');
  const model = useMemo(() => selectDefinitions(full, excludeKey.split(',')), [full, excludeKey]);
  const graph = useMemo<GraphModel>(
    () => ({
      nodes: model.definitions.map(({ id, title }) => ({ id, label: title ?? id })),
      edges: model.edges,
    }),
    [model],
  );
  const renderNode = useCallback(
    (id: string) => {
      const definition = model.byId.get(id);
      return (
        definition && (
          <DefinitionCard
            definition={definition}
            dependents={model.dependents.get(id) ?? 0}
            status={definition.external ? undefined : statusOf(review, id)}
          />
        )
      );
    },
    [model, review],
  );

  // The canvas captures the pointer, so a double-click never reaches the card; the card under the pointer is found here.
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-definition]');
      const definition = card && model.byId.get(card.getAttribute('data-definition') ?? '');
      definition && onActivate?.(definition);
    },
    [model, onActivate],
  );

  return (
    <div className='contents' onDoubleClick={handleDoubleClick}>
      <LatticeGraph graph={graph} renderNode={renderNode} lattice={LATTICE} arrange='force'>
        <KindLegend
          kinds={allKinds}
          groups={groups}
          onGroupChange={handleGroupChange}
          code={annotations.length > 0 ? code : undefined}
          onCodeChange={setCode}
        />
      </LatticeGraph>
    </div>
  );
};
