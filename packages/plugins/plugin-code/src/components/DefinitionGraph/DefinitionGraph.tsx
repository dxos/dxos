//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { type ReviewModel, type VerdictStatus, reviewAnnotations, statusOf } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import {
  type ChangeKind,
  type DefinitionFocus,
  type DefinitionModel,
  EXTERNAL_SECTION_ID,
  KIND_GROUPS,
  type KindGroup,
  type SectionModel,
  type SpecTexts,
  STATUS_STYLE,
  buildDefinitionGraph,
  diffDefinitionGraphs,
  groupOf,
  hiddenKinds,
  kindStyle,
  levelOf,
  referencesBySection,
  sectionsOf,
  selectDefinitions,
} from '../SpecModel/index.ts';

/** QA blocks name most of the design, so they start hidden to keep the design legible. */
const DEFAULT_GROUPS: Record<KindGroup, boolean> = { concepts: true, requirements: true, qa: false };

/** A card lists the sections it references most, then how many more. */
const MAX_USES = 2;

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

/**
 * The order of the rows, top to bottom: what the spec must do, then what it is built from, then how it is checked,
 * then other specs. A kind not listed sits with the types.
 */
const KIND_ORDER = [
  'plugin',
  'feat',
  'req',
  'component',
  'capability',
  'module',
  'op',
  'service',
  'db',
  'table',
  'type',
  'suite',
  'test',
  'scenario',
  'uses',
  'spec',
];

const kindRank = (kind: string): number => {
  const index = KIND_ORDER.indexOf(kind);
  return index === -1 ? KIND_ORDER.indexOf('type') : index;
};

/** Definitions in one band per kind, in {@link KIND_ORDER}, each band in spec order. */
const byKind = (definitions: readonly DefinitionModel[]): DefinitionModel[] =>
  [...definitions].sort(
    (a, b) => (a.external ? KIND_ORDER.length : kindRank(a.kind)) - (b.external ? KIND_ORDER.length : kindRank(b.kind)),
  );

/** Sections ordered by the highest kind each holds, so the spec reads top-down as its definitions do. */
const bySection = (sections: readonly SectionModel[]): SectionModel[] => {
  const rankOf = (section: SectionModel) => Math.min(...section.kinds.map(([kind]) => kindRank(kind)));
  return [...sections].sort((a, b) => rankOf(a) - rankOf(b));
};

type DefinitionCardProps = {
  definition: DefinitionModel;
  dependents: number;
  status?: VerdictStatus;
  change?: ChangeKind;
  /** References by section, which a section counts rather than draws. */
  outside?: SectionUse[];
  /** The definition the level is drawn around. */
  focused?: boolean;
  /** The fields that link it to the focused definition. */
  via?: string[];
};

const DefinitionCard = ({ definition, dependents, status, change, outside, focused, via }: DefinitionCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { icon, hue } = kindStyle(definition.kind);
  const { external } = definition;
  return (
    // An external node is outlined dashed, the convention the decision graph uses for what is not the person's own.
    <div
      className={mx(
        'contents',
        change ? CHANGE_FRAME[change] : external && '[&>*]:border-dashed [&>*]:border-2 [&>*]:border-accent-text',
        focused && '[&>*]:ring-2 [&>*]:ring-accent-text',
      )}
      title={external ? t('definition-graph.external.hint') : undefined}
    >
      <Card.Root
        data-testid='definition-graph.definition'
        data-definition={definition.id}
        data-kind={definition.kind}
        data-external={external?.target}
        data-status={status}
        data-change={change}
        data-focused={focused ? '' : undefined}
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
              <Icon.Icon icon={STATUS_STYLE[status].icon} classNames={STATUS_STYLE[status].text} />
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
              {via?.map((field) => (
                <Tag.Tag key={field} data-testid='definition-graph.via'>
                  <Icon.Icon icon='ph--link-simple--regular' size='xs' />
                  {field}
                </Tag.Tag>
              ))}
              {change && <Tag.Tag hue={CHANGE_HUE[change]}>{t(`definition-graph.change.${change}.label`)}</Tag.Tag>}
              <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
              {status && <Tag.Tag hue={STATUS_STYLE[status].hue}>{STATUS_STYLE[status].label}</Tag.Tag>}
              {dependents > 0 && <Tag.Tag>{t('definition-graph.used-by.label', { count: dependents })}</Tag.Tag>}
              {definition.requirements > 0 && (
                <Tag.Tag>{t('definition-graph.requirements.label', { count: definition.requirements })}</Tag.Tag>
              )}
              {definition.codeRefs > 0 && (
                <Tag.Tag hue='amber' data-testid='definition-graph.code-refs'>
                  {t('definition-graph.code-refs.label', { count: definition.codeRefs })}
                </Tag.Tag>
              )}
            </Layout.Flex>
          </Card.Row>
          {outside && outside.length > 0 && (
            <Card.Row>
              <UsesTags uses={outside} />
            </Card.Row>
          )}
        </Card.Body>
      </Card.Root>
    </div>
  );
};

/** How many references a definition or section makes into another section. */
type SectionUse = { title: string; count: number; external: boolean };

/** The sections referenced most, then how many more. */
const UsesTags = ({ uses }: { uses: SectionUse[] }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Layout.Flex wrap gap='xs'>
      {uses.slice(0, MAX_USES).map(({ title, count, external }) => (
        <Tag.Tag key={title} data-testid='definition-graph.outside'>
          <Icon.Icon icon={external ? 'ph--arrow-square-out--regular' : 'ph--arrow-right--regular'} size='xs' />
          {t('definition-graph.outside.label', { section: title, count })}
        </Tag.Tag>
      ))}
      {uses.length > MAX_USES && (
        <Tag.Tag>{t('definition-graph.hidden.label', { count: uses.length - MAX_USES })}</Tag.Tag>
      )}
    </Layout.Flex>
  );
};

/** A heading over the definitions on one side of the focused one; absent when it has none. */
const NeighbourGroup = ({ label, count, children }: { label: string; count: number; children: ReactNode }) =>
  count === 0 ? null : (
    <Layout.Flex column gap='xs'>
      <Layout.Flex align='center' gap='xs' classNames='text-sm text-description'>
        {label}
        <Tag.Tag>{count}</Tag.Tag>
      </Layout.Flex>
      {children}
    </Layout.Flex>
  );

type SectionCardProps = {
  section: SectionModel;
  /** How many references its definitions make into each other section, which the whole-spec level never draws. */
  uses: SectionUse[];
  changes?: Record<ChangeKind, number>;
};

/** A section of the spec, folded: its heading and how many definitions of each kind it holds. */
const SectionCard = ({ section, uses, changes }: SectionCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const title = sectionTitle(t, section);
  return (
    <div className={mx('contents', section.external && '[&>*]:border-dashed [&>*]:border-2 [&>*]:border-accent-text')}>
      <Card.Root
        data-testid='definition-graph.section'
        data-section={section.id}
        title={t('definition-graph.section.hint')}
      >
        <Card.Header>
          <Layout.Block rail='start'>
            <Icon.Icon icon={section.external ? 'ph--arrow-square-out--regular' : 'ph--folder-simple--regular'} />
          </Layout.Block>
          <Card.Title truncate>{title}</Card.Title>
          <Layout.Block rail='end'>
            <Tag.Tag>{section.definitions.length}</Tag.Tag>
          </Layout.Block>
        </Card.Header>
        <Card.Body>
          <Card.Row>
            <Layout.Flex wrap gap='xs'>
              {section.kinds.map(([kind, count]) => (
                <Tag.Tag key={kind} hue={kindStyle(kind).hue}>
                  <Icon.Icon icon={kindStyle(kind).icon} size='xs' />
                  {count} {kind}
                </Tag.Tag>
              ))}
            </Layout.Flex>
          </Card.Row>
          {uses.length > 0 && (
            <Card.Row>
              <UsesTags uses={uses} />
            </Card.Row>
          )}
          <Card.Row>
            <Layout.Flex wrap gap='xs'>
              {changes &&
                (['added', 'changed', 'removed'] as const).map(
                  (change) =>
                    changes[change] > 0 && (
                      <Tag.Tag key={change} hue={CHANGE_HUE[change]}>
                        {t(`definition-graph.change.${change}.count`, { count: changes[change] })}
                      </Tag.Tag>
                    ),
                )}
            </Layout.Flex>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    </div>
  );
};

const sectionTitle = (t: (key: string) => string, section?: SectionModel): string =>
  section?.external
    ? t('definition-graph.section.external.label')
    : (section?.title ?? t('definition-graph.section.none.label'));

type KindLegendProps = {
  /** Every kind in the spec, shown or not, so a hidden group still lists what it holds. */
  kinds: string[];
  groups: Record<KindGroup, boolean>;
  onGroupChange: (group: KindGroup, shown: boolean) => void;
  /** Whether names that appear only in prose draw dashed arrows too. */
  mentions: boolean;
  onMentionsChange: (mentions: boolean) => void;
  /** How many definitions each kind of change touched; absent outside diff mode. */
  changes?: Record<ChangeKind, number>;
};

/** One switch per group, each beside the kinds it holds. */
const KindLegend = ({ kinds, groups, onGroupChange, mentions, onMentionsChange, changes }: KindLegendProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Layout.Flex column gap='xs' classNames='px-2 pb-2 border-b border-separator' data-testid='definition-graph.legend'>
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
            .filter((kind) => groupOf(kind) === group)
            .map((kind) => (
              <Tag.Tag key={kind} hue={groups[group] ? kindStyle(kind).hue : 'neutral'}>
                <Icon.Icon icon={kindStyle(kind).icon} size='xs' />
                {kind}
              </Tag.Tag>
            ))}
        </Layout.Flex>
      ))}
      <Input.Switch
        checked={mentions}
        onCheckedChange={({ checked }) => onMentionsChange(checked)}
        label={t('definition-graph.mentions.label')}
        data-testid='definition-graph.mentions'
      />
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
  /** The latest compliance review; its verdicts badge the cards and its evidence counts their code links. */
  review?: ReviewModel;
  /** The base version of `content`; when given, the graph shows what changed since it (diff mode). */
  base?: string;
  /** Block kinds to leave out. */
  exclude?: string[];
  /** Which groups of kinds start shown (concepts and requirements by default); the legend's switches change them. */
  defaultGroups?: Partial<Record<KindGroup, boolean>>;
  /** Double-click: an external node opens its spec or code; a local one is revealed in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
  /** The level it opens on; the whole spec by default. */
  defaultFocus?: DefinitionFocus;
};

/**
 * A spec's definitions, one level at a time. It opens on the spec's sections, a card each; opening a section lists its
 * definitions in bands by kind, each card counting its references by section. Opening a definition lists what uses
 * it above it and what it uses below, each tagged with the field that links them. Blocks of other specs are dashed
 * boxes; names in prose are listed only when asked for.
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
  defaultFocus,
}: DefinitionGraphProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const [focus, setFocus] = useState<DefinitionFocus>(() => defaultFocus ?? {});
  const [legend, setLegend] = useState(false);
  const [groups, setGroups] = useState<Record<KindGroup, boolean>>(() => ({ ...DEFAULT_GROUPS, ...defaultGroups }));
  const handleGroupChange = useCallback(
    (group: KindGroup, shown: boolean) => setGroups((groups) => ({ ...groups, [group]: shown })),
    [],
  );
  const [mentions, setMentions] = useState(false);
  const annotations = useMemo(() => reviewAnnotations(review), [review]);
  const current = useMemo(
    () => buildDefinitionGraph(content, { specs, annotations, index }),
    [content, specs, annotations, index],
  );
  const diff = useMemo(
    () =>
      base === undefined
        ? undefined
        : diffDefinitionGraphs(current, buildDefinitionGraph(base, { specs, annotations, index }), {
            current: content,
            base,
          }),
    [current, content, base, specs, annotations, index],
  );
  const full = diff ?? current;
  const allKinds = useMemo(() => [...new Set(full.definitions.map(({ kind }) => kind))], [full]);
  // A key rather than the array, so a caller passing a fresh literal each render does not re-lay out the graph.
  const excludeKey = [...exclude, ...hiddenKinds(allKinds, groups)].join(',');
  const model = useMemo(
    () => selectDefinitions(full, excludeKey.split(','), { mentions }),
    [full, excludeKey, mentions],
  );
  const sections = useMemo(() => sectionsOf(model), [model]);
  // A level whose section or definition the filters hid falls back to the whole spec.
  const shownFocus = useMemo<DefinitionFocus>(
    () => ({
      section: focus.section && sections.some(({ id }) => id === focus.section) ? focus.section : undefined,
      definition: focus.definition && model.byId.has(focus.definition) ? focus.definition : undefined,
    }),
    [focus, sections, model],
  );
  useEffect(() => {
    if (shownFocus.section !== focus.section || shownFocus.definition !== focus.definition) {
      setFocus(shownFocus);
    }
  }, [shownFocus, focus]);
  const level = useMemo(
    () => levelOf(model, sections, shownFocus, { neighbours: Number.POSITIVE_INFINITY }),
    [model, sections, shownFocus],
  );
  const references = useMemo(() => referencesBySection(model, sections), [model, sections]);
  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const focusedDefinition = shownFocus.definition ? model.byId.get(shownFocus.definition) : undefined;
  const currentSection = shownFocus.section ? sectionById.get(shownFocus.section) : undefined;
  // Each neighbour of the focused definition, by the fields that link the two.
  const neighbours = useMemo(() => {
    if (!focusedDefinition) {
      return undefined;
    }
    const linked = (end: 'from' | 'to') => {
      const fields = new Map<string, string[]>();
      for (const edge of level.edges) {
        const [near, far] = end === 'to' ? [edge.from, edge.to] : [edge.to, edge.from];
        if (near === focusedDefinition.id && far !== near) {
          const field = edge.field ?? (edge.kind === 'mention' ? t('definition-graph.mention.label') : undefined);
          const list = fields.get(far) ?? [];
          field && !list.includes(field) && list.push(field);
          fields.set(far, list);
        }
      }
      return fields;
    };
    return { usedBy: linked('from'), uses: linked('to') };
  }, [level, focusedDefinition, t]);
  const changeCountsOf = useCallback(
    (definitions: readonly DefinitionModel[]) => {
      if (!diff) {
        return undefined;
      }
      const counts: Record<ChangeKind, number> = { added: 0, changed: 0, removed: 0 };
      definitions.forEach(({ id }) => {
        const change = diff.changes.get(id);
        change && counts[change]++;
      });
      return counts;
    },
    [diff],
  );
  const changeCounts = useMemo(() => changeCountsOf(model.definitions), [changeCountsOf, model]);
  const usesOf = useCallback(
    (counts: Iterable<[section: string, count: number]>): SectionUse[] =>
      [...counts]
        .map(([target, count]) => ({
          title: sectionTitle(t, sectionById.get(target)),
          count,
          external: target === EXTERNAL_SECTION_ID,
        }))
        .sort((a, b) => Number(a.external) - Number(b.external) || b.count - a.count),
    [sectionById, t],
  );
  // A section's references to its own definitions stay inside it, so its card counts only the others.
  const sectionUses = useCallback(
    (section: SectionModel) => {
      const counts = new Map<string, number>();
      section.definitions.forEach(({ id }) =>
        references
          .get(id)
          ?.forEach((count, target) => target !== section.id && counts.set(target, (counts.get(target) ?? 0) + count)),
      );
      return usesOf(counts);
    },
    [references, usesOf],
  );
  const renderNode = useCallback(
    (id: string) => {
      const node = level.nodes.find((node) => node.id === id);
      if (node?.kind === 'section') {
        return (
          <SectionCard
            section={node.section}
            uses={sectionUses(node.section)}
            changes={changeCountsOf(node.section.definitions)}
          />
        );
      }
      const definition = node?.definition;
      return (
        definition && (
          <DefinitionCard
            definition={definition}
            dependents={model.dependents.get(id) ?? 0}
            status={definition.external ? undefined : statusOf(review, id)}
            change={diff?.changes.get(id)}
            focused={definition.id === focusedDefinition?.id}
            outside={focusedDefinition ? undefined : usesOf(references.get(id) ?? [])}
            via={neighbours?.uses.get(id) ?? neighbours?.usedBy.get(id)}
          />
        )
      );
    },
    [level, sectionUses, usesOf, changeCountsOf, model, review, diff, focusedDefinition, references, neighbours],
  );

  // A section opens; a definition opens around itself, and the one already open is shown in the spec.
  const handleOpen = useCallback(
    (id: string) => {
      if (sectionById.has(id)) {
        setFocus({ section: id });
        return;
      }
      const definition = model.byId.get(id);
      if (!definition) {
        return;
      }
      if (definition.external || definition.id === focusedDefinition?.id) {
        onActivate?.(definition);
      } else {
        setFocus({
          section: sections.find(({ definitions }) => definitions.includes(definition))?.id,
          definition: definition.id,
        });
      }
    },
    [model, sections, sectionById, focusedDefinition, onActivate],
  );

  const cards = useMemo(
    () =>
      focusedDefinition
        ? []
        : currentSection
          ? byKind(level.nodes.flatMap((node) => (node.kind === 'definition' ? [node.definition] : []))).map(
              ({ id }) => id,
            )
          : bySection(level.nodes.flatMap((node) => (node.kind === 'section' ? [node.section] : []))).map(
              ({ id }) => id,
            ),
    [level, focusedDefinition, currentSection],
  );
  const neighbourIds = (fields: Map<string, string[]>) =>
    byKind([...fields.keys()].flatMap((id) => model.byId.get(id) ?? [])).map(({ id }) => id);
  const cardGrid = (ids: readonly string[]) => (
    <div className='grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-start gap-2'>
      {ids.map((id) => (
        <button
          key={id}
          type='button'
          className='block text-start rounded-md dx-focus-ring'
          onClick={() => handleOpen(id)}
          data-testid='definition-graph.open'
        >
          {renderNode(id)}
        </button>
      ))}
    </div>
  );

  const focusSection = focusedDefinition
    ? sections.find(({ definitions }) => definitions.some(({ id }) => id === focusedDefinition.id))
    : currentSection;

  return (
    <Layout.Flex column classNames='dx-fill'>
      <Layout.Flex align='center' gap='sm' classNames='px-2 py-1 min-h-[2.5rem]'>
        <Breadcrumb.Root aria-label={t('definition-graph.breadcrumb.label')} classNames='shrink-0'>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              {focusSection ? (
                <Breadcrumb.Link asChild>
                  <button type='button' onClick={() => setFocus({})} data-testid='definition-graph.crumb.spec'>
                    {t('definition-graph.crumb.spec.label')}
                  </button>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.Current>{t('definition-graph.crumb.spec.label')}</Breadcrumb.Current>
              )}
            </Breadcrumb.Item>
            {focusSection && (
              <>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  {focusedDefinition ? (
                    <Breadcrumb.Link asChild>
                      <button
                        type='button'
                        onClick={() => setFocus({ section: focusSection.id })}
                        data-testid='definition-graph.crumb.section'
                      >
                        {sectionTitle(t, focusSection)}
                      </button>
                    </Breadcrumb.Link>
                  ) : (
                    <Breadcrumb.Current>{sectionTitle(t, focusSection)}</Breadcrumb.Current>
                  )}
                </Breadcrumb.Item>
              </>
            )}
            {focusedDefinition && (
              <>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Current classNames='font-mono'>{focusedDefinition.id}</Breadcrumb.Current>
                </Breadcrumb.Item>
              </>
            )}
          </Breadcrumb.List>
        </Breadcrumb.Root>
        <span className='grow' />
        <Button.Root
          variant='ghost'
          icon='ph--funnel-simple--regular'
          iconOnly
          label={t('definition-graph.filters.label')}
          aria-expanded={legend}
          onClick={() => setLegend((legend) => !legend)}
          data-testid='definition-graph.filters'
        />
      </Layout.Flex>
      <p className='px-2 pb-1 text-xs text-description' data-testid='definition-graph.hint'>
        {t(
          focusedDefinition
            ? 'definition-graph.hint.definition'
            : currentSection
              ? 'definition-graph.hint.section'
              : 'definition-graph.hint.spec',
        )}
      </p>
      {legend && (
        <KindLegend
          kinds={allKinds}
          groups={groups}
          onGroupChange={handleGroupChange}
          mentions={mentions}
          onMentionsChange={setMentions}
          changes={changeCounts}
        />
      )}
      <ScrollArea.Root orientation='vertical' classNames='dx-grow'>
        <ScrollArea.Viewport classNames='px-2 pb-2'>
          <div data-testid='definition-graph'>
            {focusedDefinition && neighbours ? (
              <Layout.Flex column gap='sm'>
                <NeighbourGroup label={t('definition-graph.used-by.heading')} count={neighbours.usedBy.size}>
                  {cardGrid(neighbourIds(neighbours.usedBy))}
                </NeighbourGroup>
                {cardGrid([focusedDefinition.id])}
                <NeighbourGroup label={t('definition-graph.uses.heading')} count={neighbours.uses.size}>
                  {cardGrid(neighbourIds(neighbours.uses))}
                </NeighbourGroup>
              </Layout.Flex>
            ) : (
              cardGrid(cards)
            )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Flex>
  );
};
