//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { type ReviewModel, type VerdictStatus, reviewAnnotations, statusOf } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';
import { type GraphModel, type LatticeSpec } from '@dxos/react-ui-canvas';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { LatticeGraph } from '../LatticeGraph/index.ts';
import {
  type ChangeKind,
  type DefinitionModel,
  KIND_GROUPS,
  type KindGroup,
  type SpecTexts,
  STATUS_STYLE,
  buildDefinitionGraph,
  diffDefinitionGraphs,
  groupOf,
  hiddenKinds,
  kindStyle,
  selectDefinitions,
} from '../SpecModel/index.ts';

/** QA blocks name most of the design, so they start hidden to keep the design legible. */
const DEFAULT_GROUPS: Record<KindGroup, boolean> = { concepts: true, requirements: true, qa: false };

/** Short cards: a definition shows its kind, id and title, and its dependencies are the arrows. */
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 64, gutterY: 64 };

/**
 * How a changed card is framed in diff mode: an addition boxed in green, a change in amber, and a removal faded and
 * dashed so it reads as gone. The wrapper is `display: contents`, so the frame goes on the card itself.
 */
const CHANGE_FRAME: Record<ChangeKind, string> = {
  added: '[&>*]:border-2 [&>*]:border-success-text',
  changed: '[&>*]:border-2 [&>*]:border-warning-text',
  removed: '[&>*]:border-2 [&>*]:border-dashed [&>*]:border-error-text [&>*]:opacity-50 [&>*]:grayscale',
};

const CHANGE_HUE: Record<ChangeKind, 'success' | 'warning' | 'error'> = {
  added: 'success',
  changed: 'warning',
  removed: 'error',
};

/** Arrows the change added are green; arrows it removed are red and dashed. */
const EDGE_STYLE = {
  added: { hue: 'green' },
  removed: { hue: 'red', lineStyle: 'dashed' },
} as const;

type DefinitionCardProps = {
  definition: DefinitionModel;
  dependents: number;
  status?: VerdictStatus;
  change?: ChangeKind;
};

const DefinitionCard = ({ definition, dependents, status, change }: DefinitionCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { icon, hue } = kindStyle(definition.kind);
  const { external } = definition;
  return (
    // An external node is outlined dashed, the convention the decision graph uses for what is not the person's own.
    <div
      className={mx(
        'contents',
        change ? CHANGE_FRAME[change] : external && '[&>*]:border-dashed [&>*]:border-2 [&>*]:border-accent-text',
      )}
      title={external ? t('definition-graph.external.hint') : t('definition-graph.local.hint')}
    >
      <Card.Root
        data-testid='definition-graph.definition'
        data-definition={definition.id}
        data-kind={definition.kind}
        data-external={external?.target}
        data-status={status}
        data-change={change}
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
              {change && <Tag.Tag hue={CHANGE_HUE[change]}>{t(`definition-graph.change.${change}.label`)}</Tag.Tag>}
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
  /** How many definitions each kind of change touched; absent outside diff mode. */
  changes?: Record<ChangeKind, number>;
};

/** One switch per group, each beside the kinds it holds. */
const KindLegend = ({ kinds, groups, onGroupChange, code, onCodeChange, changes }: KindLegendProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Layout.Flex
      column
      gap='xs'
      classNames='absolute top-2 start-2 z-10 p-2 rounded-sm bg-base-surface border border-separator'
      data-testid='definition-graph.legend'
    >
      {changes && (
        <Layout.Flex wrap gap='xs'>
          {(['added', 'changed', 'removed'] as const).map(
            (change) =>
              changes[change] > 0 && (
                <Tag.Tag key={change} hue={CHANGE_HUE[change]} data-testid={`definition-graph.changes.${change}`}>
                  {t(`definition-graph.change.${change}.count`, { count: changes[change] })}
                </Tag.Tag>
              ),
          )}
        </Layout.Flex>
      )}
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
  /** Resolves `<spec id>#<item>` references to other specs' files; without it only `github:` keys name them. */
  index?: SpecIndex;
  /** The latest compliance review; its verdicts badge the cards and its evidence adds the code boxes. */
  review?: ReviewModel;
  /** The base version of `content`; when given, the graph shows what changed since it (diff mode). */
  base?: string;
  /** Block kinds to leave out. */
  exclude?: string[];
  /** Which groups of kinds start shown (concepts and requirements by default); the legend's switches change them. */
  defaultGroups?: Partial<Record<KindGroup, boolean>>;
  /** Double-click: an external node opens its spec or code; a local one is revealed in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * Every definition of a spec on a lattice, with an arrow from each to the definitions it names, so the
 * spec reads top-down from features to the types they rest on. Blocks of other specs the spec names by id or `github:` key,
 * and the code symbols the review links its items to, are drawn as dashed boxes.
 */
export const DefinitionGraph = ({
  content,
  specs,
  index,
  review,
  base,
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
  const current = useMemo(
    () => buildDefinitionGraph(content, specs, annotations, index),
    [content, specs, annotations, index],
  );
  const diff = useMemo(
    () =>
      base === undefined
        ? undefined
        : diffDefinitionGraphs(current, buildDefinitionGraph(base, specs, annotations, index), {
            current: content,
            base,
          }),
    [current, content, base, specs, annotations, index],
  );
  const full = diff ?? current;
  const allKinds = useMemo(() => [...new Set(full.definitions.map(({ kind }) => kind))], [full]);
  // A key rather than the array, so a caller passing a fresh literal each render does not re-lay out the graph.
  // Code has its own switch, so the concepts group never hides it.
  const excludeKey = [
    ...exclude,
    ...hiddenKinds(
      allKinds.filter((kind) => kind !== 'code'),
      groups,
    ),
    ...(code ? [] : ['code']),
  ].join(',');
  const model = useMemo(() => selectDefinitions(full, excludeKey.split(',')), [full, excludeKey]);
  const graph = useMemo<GraphModel>(
    () => ({
      nodes: model.definitions.map(({ id, title }) => ({ id, label: title ?? id })),
      edges: model.edges.map((edge) => {
        const change = diff?.edgeChanges.get(edge.id);
        return change ? { ...edge, style: EDGE_STYLE[change] } : edge;
      }),
    }),
    [model, diff],
  );
  const changeCounts = useMemo(() => {
    if (!diff) {
      return undefined;
    }
    const counts: Record<ChangeKind, number> = { added: 0, changed: 0, removed: 0 };
    model.definitions.forEach(({ id }) => {
      const change = diff.changes.get(id);
      change && counts[change]++;
    });
    return counts;
  }, [diff, model]);
  const renderNode = useCallback(
    (id: string) => {
      const definition = model.byId.get(id);
      return (
        definition && (
          <DefinitionCard
            definition={definition}
            dependents={model.dependents.get(id) ?? 0}
            status={definition.external ? undefined : statusOf(review, id)}
            change={diff?.changes.get(id)}
          />
        )
      );
    },
    [model, review, diff],
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
          changes={changeCounts}
        />
      </LatticeGraph>
    </div>
  );
};
