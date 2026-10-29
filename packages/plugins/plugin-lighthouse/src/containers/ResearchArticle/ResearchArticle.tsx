//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Operation from '@dxos/compute/Operation';
import { Filter, Format, Obj, Query, Ref, Tag } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { Attention, useSelection } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { Masonry } from '@dxos/react-ui-masonry';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import { Tag as TagChip } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';

import { type Entity, type Session } from '#client';
import { ModelPanel, ResearchThread, ResultCard, SubjectGraph, TracePanel } from '#components';
import { useEngines, useExplain, useLighthouseClient, useSession, useSubjectGraph } from '#hooks';
import { meta } from '#meta';
import {
  BUDGETS,
  type CardModel,
  type Rating,
  type RatingOverrides,
  applyVote,
  formatBudget,
  imagesOf,
  isResult,
  isThin,
  matchPicks,
  nextVote,
  pickKey,
  rank,
  toCard,
  toMessages,
  withLinkedGeo,
} from '#model';
import { Finding, LighthouseOperation, Research } from '#types';

import { LIGHTHOUSE_CONNECTOR_ID, RESULT_COMPANION } from '../../constants.ts';
import { findingEntity } from '../../util/index.ts';

export type ResearchArticleProps = AppSurface.ObjectArticleProps<Research.Research>;

const ResearchFormSchema = Schema.Struct({
  goal: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text)).annotate({
    title: 'Goal',
    description: 'What to find, and what matters about it.',
  }),
  budget: Research.BudgetPreset,
});

type ResearchFormValues = Schema.Schema.Type<typeof ResearchFormSchema>;

/** At most this many tiles; lighthouse sessions can extract thousands of subjects. */
const MAX_TILES = 300;

type TileData = {
  id: string;
  card: CardModel;
  entity?: Entity;
  rating?: Rating;
  current: boolean;
  starred: boolean;
  vote?: 'up' | 'down';
  why?: string;
};

/** What the operations keep of a result: the article's copy of its facts and its score. */
const toFindingInput = (entity: Entity, card: CardModel, extra: { score?: number; why?: string } = {}) => ({
  iri: entity.id,
  title: card.title,
  ...(card.url ? { url: card.url } : {}),
  types: entity.types,
  images: card.images,
  properties: entity.props,
  ...(extra.score !== undefined ? { score: extra.score } : {}),
  ...(extra.why ? { why: extra.why } : {}),
});

const Meters = ({ session, connected }: { session: Session; connected: boolean }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { spent, budget } = session;
  const minutes = Math.floor(spent.seconds / 60);
  const seconds = String(Math.round(spent.seconds % 60)).padStart(2, '0');
  return (
    <Layout.Flex gap='sm' wrap align='center' classNames='text-xs text-fg-muted tabular-nums' role='status'>
      <span>{t('meter-pages.label', { spent: spent.pages, limit: budget.pages ?? '∞' })}</span>
      <span>{t('meter-cost.label', { spent: spent.usd.toFixed(3), limit: budget.usd?.toFixed(2) ?? '∞' })}</span>
      <span>{t('meter-time.label', { spent: `${minutes}:${seconds}`, limit: budget.minutes ?? '∞' })}</span>
      <TagChip hue={session.busy ? 'amber' : session.status === 'failed' ? 'red' : 'neutral'}>
        {t(`status.${session.status}`)}
      </TagChip>
      {!connected && <TagChip hue='amber'>{t('reconnecting.label')}</TagChip>}
    </Layout.Flex>
  );
};

/**
 * Master/detail article for a Research, in plugin-commerce's SearchArticle shape. The left pane holds the goal, the
 * budget, the search engines and Run, and under them the session's steering thread; the right pane is the masonry of
 * results ranked by the session's rating model. Selecting a tile opens its detail in the companion.
 */
export const ResearchArticle = ({ role, subject, attendableId }: ResearchArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const showItem = ToolkitHooks.useShowItem();
  const research = subject;
  const [snapshot] = useObject(research);
  const db = Obj.getDatabase(research);
  const id = attendableId ?? Obj.getURI(research);
  const currentId = useSelection(id, 'single');

  const client = useLighthouseClient(research);
  const engines = useEngines(client);
  const { state, update } = useSession(client, snapshot.run);
  const session = state.session;

  const connections = useQuery(db, Filter.type(Connection.Connection, { connectorId: LIGHTHOUSE_CONNECTOR_ID }));
  const feed = research.feed?.target;
  const findings = useQuery(
    db,
    feed ? Query.select(Filter.type(Finding.Finding)).from(feed) : Query.select(Filter.nothing()),
  );
  const [starredTag] = useQuery(db, Filter.foreignKeys(Tag.Tag, [Research.STARRED_TAG]));
  const starredUri = starredTag ? Obj.getURI(starredTag).toString() : undefined;
  const starredIris = useMemo(
    () =>
      new Set(
        findings
          .filter((finding) => Research.isStarred(research, finding.id, starredUri))
          .map((finding) => finding.iri),
      ),
    [findings, research, starredUri],
  );

  const [view, setView] = useState<'all' | 'findings'>('all');
  // Results (the ranked masonry), Graph (the subjects' neighbourhood) or Trace (the trajectory as a tree).
  const [mode, setMode] = useState<'results' | 'graph' | 'trace'>('results');
  const [showModel, setShowModel] = useState(false);
  // A double-click refocuses the graph on a node; Back to subjects returns to the session's roots.
  const [focus, setFocus] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const spaceId = db?.spaceId;

  /** Invokes an operation in the Research's space, showing its failure beside Run. */
  const invoke = useCallback(
    async <I, O>(operation: Operation.Definition<I, O>, input: I): Promise<O | undefined> => {
      const { data, error } = await invokePromise(operation, ...([input, { spaceId }] as const));
      if (error) {
        setError(error.message);
        log.catch(error);
      }
      return data;
    },
    [invokePromise, spaceId],
  );

  //
  // Results
  //

  // Listings that place themselves through a linked schema:geo node get its point copied on, so rating, the map and
  // the cards read one location (lighthouse SessionView does the same).
  const items = useMemo(
    () =>
      withLinkedGeo(
        state.results.filter((entity) => isResult(entity) && !isThin(entity)),
        state.results,
      ),
    [state.results],
  );
  const { ranked, ratings } = useMemo(
    () => rank(items, state.rating.model, state.rating.overrides),
    [items, state.rating.model, state.rating.overrides],
  );
  const picks = useMemo(
    () => matchPicks(session?.report?.picks ?? [], state.results),
    [session?.report, state.results],
  );

  const tiles = useMemo<TileData[]>(() => {
    if (view === 'findings') {
      const latest = new Map(findings.map((finding) => [finding.iri, finding]));
      return [...latest.values()].map((finding) => {
        const entity = findingEntity(finding);
        const card = toCard(entity);
        return {
          id: finding.iri,
          // A starred result reads as starred even when the report later names it as a pick too.
          card: { ...card, eyebrow: t(starredIris.has(finding.iri) ? 'kept-person.label' : 'kept-pick.label') },
          entity,
          current: finding.iri === currentId,
          starred: starredIris.has(finding.iri),
          vote: state.rating.feedback[finding.iri],
          why: finding.why,
        };
      });
    }
    const picked = new Set(picks.flatMap(({ entity }) => (entity ? [entity.id] : [])));
    // A report can name one subject in several picks (a firm's identity, its team, its portfolio): one card each.
    const seenPicks = new Set<string>();
    const uniquePicks = picks.filter((matched) => {
      const key = matched.entity?.id ?? pickKey(matched);
      if (seenPicks.has(key)) {
        return false;
      }
      seenPicks.add(key);
      return true;
    });
    // An entity session opens on pictures: picks with a photo or logo first.
    const orderedPicks =
      session?.intent === 'entity'
        ? [...uniquePicks].sort(
            (a, b) =>
              Number(!!b.entity && imagesOf(b.entity).length > 0) - Number(!!a.entity && imagesOf(a.entity).length > 0),
          )
        : uniquePicks;
    const pickTiles = orderedPicks.map((matched): TileData => {
      const card = matched.entity
        ? toCard(matched.entity)
        : {
            id: pickKey(matched),
            title: matched.pick.title,
            url: matched.pick.url,
            images: [],
            icon: 'ph--push-pin--regular',
            rows: [],
            tags: [],
          };
      const tileId = matched.entity?.id ?? pickKey(matched);
      return {
        id: tileId,
        card: { ...card, eyebrow: t('pick.label', { index: matched.index + 1 }), description: matched.pick.why },
        entity: matched.entity,
        rating: matched.entity ? ratings?.get(matched.entity.id) : undefined,
        current: tileId === currentId,
        starred: starredIris.has(tileId),
        vote: state.rating.feedback[tileId],
        why: matched.pick.why,
      };
    });
    // An entity session's results are its subjects' graph: with no ranking to speak of, the ones with a picture
    // (companies' logos, people's photos) come first so the view does not open on blank cards (funds, roles).
    const withPictures =
      session?.intent === 'entity'
        ? [...ranked].sort((a, b) => Number(imagesOf(b).length > 0) - Number(imagesOf(a).length > 0))
        : ranked;
    const rest = withPictures
      .filter((entity) => !picked.has(entity.id))
      .slice(0, MAX_TILES)
      .map((entity): TileData => ({
        id: entity.id,
        card: toCard(entity),
        entity,
        rating: ratings?.get(entity.id),
        current: entity.id === currentId,
        starred: starredIris.has(entity.id),
        vote: state.rating.feedback[entity.id],
      }));
    if (session?.intent === 'entity') {
      // "Everything about X" opens on pictures: whatever has a photo or logo (picks first), then the rest.
      const pictured = (tile: TileData) => tile.card.images.length > 0;
      return [
        ...pickTiles.filter(pictured),
        ...rest.filter(pictured),
        ...pickTiles.filter((tile) => !pictured(tile)),
        ...rest.filter((tile) => !pictured(tile)),
      ];
    }
    return [...pickTiles, ...rest];
  }, [view, findings, picks, ranked, ratings, currentId, starredIris, state.rating.feedback, session?.intent, t]);

  //
  // Actions
  //

  const handleRun = useCallback(() => {
    setError(undefined);
    const connection = research.connection ?? (connections[0] ? Ref.make(connections[0]) : undefined);
    const goal = research.goal.trim() ? undefined : session?.goal;
    if ((!research.connection && connection) || goal) {
      Obj.update(research, (research) => {
        if (!research.connection && connection) {
          research.connection = connection;
        }
        // A Research opened on a session started elsewhere runs again with that session's goal.
        if (goal) {
          research.goal = goal;
        }
      });
    }
    setEditing(false);
    void invoke(LighthouseOperation.StartResearch, { research: Ref.make(research) });
  }, [research, connections, session?.goal, invoke]);

  const handleSend = useCallback(
    async (text: string, options?: { model?: string }) => {
      await invoke(LighthouseOperation.SendToResearch, { research: Ref.make(research), text, ...options });
    },
    [research, invoke],
  );

  const handleStop = useCallback(() => {
    void invoke(LighthouseOperation.StopResearch, { research: Ref.make(research) });
  }, [research, invoke]);

  const handleVote = useCallback(
    (tile: TileData, clicked: 'up' | 'down') => {
      const vote = nextVote(tile.vote, clicked);
      update((state) => applyVote(state, tile.id, vote));
      void invoke(LighthouseOperation.VoteFinding, { research: Ref.make(research), iri: tile.id, vote });
    },
    [research, update, invoke],
  );

  const handleToggleStar = useCallback(
    (tile: TileData) => {
      const entity = tile.entity ?? { id: tile.id, types: [], props: {} };
      void invoke(LighthouseOperation.KeepFinding, {
        research: Ref.make(research),
        finding: toFindingInput(entity, tile.card, { score: tile.rating?.score, why: tile.why }),
        starred: !tile.starred,
      });
    },
    [research, invoke],
  );

  const handleSelect = useCallback(
    (tileId: string) => {
      void showItem({ contextId: id, selectionId: tileId, companion: Attention.linkedSegment(RESULT_COMPANION) });
    },
    [id, showItem],
  );
  const itemProps = useCallback((tileId: string) => ({ onActivate: () => handleSelect(tileId) }), [handleSelect]);

  // The report's picks are kept in the space as Findings, once each, as soon as the session reports.
  const syncedReport = useRef<string>(undefined);
  useEffect(() => {
    if (!session?.report || picks.length === 0 || !snapshot.run) {
      return;
    }
    const signature = `${snapshot.run}:${picks.map(pickKey).join('|')}`;
    if (syncedReport.current === signature) {
      return;
    }
    syncedReport.current = signature;
    const inputs = picks.map((matched) => {
      const entity = matched.entity ?? { id: pickKey(matched), types: [], props: {} };
      const card = matched.entity
        ? toCard(matched.entity)
        : {
            id: entity.id,
            title: matched.pick.title,
            url: matched.pick.url,
            images: [],
            icon: 'ph--push-pin--regular',
            rows: [],
            tags: [],
          };
      return toFindingInput(entity, card, { score: ratings?.get(entity.id)?.score, why: matched.pick.why });
    });
    void invoke(LighthouseOperation.SyncFindings, { research: Ref.make(research), picks: inputs });
  }, [session?.report, picks, ratings, snapshot.run, research, invoke]);

  const handleSave = useCallback(
    (values: ResearchFormValues) => {
      Obj.update(research, (research) => {
        research.goal = values.goal;
        research.budget = values.budget;
      });
    },
    [research],
  );

  const handleToggleEngine = useCallback(
    (engine: string, checked: boolean) => {
      Obj.update(research, (research) => {
        const current = research.engines ?? [];
        research.engines = checked
          ? [...current.filter((id) => id !== engine), engine]
          : current.filter((id) => id !== engine);
      });
    },
    [research],
  );

  const busy = session?.busy ?? false;

  // An entity session ("everything about X") opens on its subjects' graph; a list session on the ranked results.
  const intent = session?.intent;
  const roots = useMemo(
    () =>
      session?.subjects ??
      session?.report?.subjects ??
      (intent === 'entity' ? picks.flatMap(({ entity }) => (entity ? [entity.id] : [])) : []),
    [session?.subjects, session?.report?.subjects, intent, picks],
  );
  const defaulted = useRef<string>(undefined);
  useEffect(() => {
    if (session && defaulted.current !== session.run) {
      defaulted.current = session.run;
      setMode(session.intent === 'entity' ? 'graph' : 'results');
      setFocus(undefined);
    }
  }, [session]);

  const graphRoots = useMemo(() => (focus ? [focus] : roots), [focus, roots]);
  const subjectGraph = useSubjectGraph(mode === 'graph' ? client : undefined, graphRoots);
  const trace = useExplain(mode === 'trace' ? client : undefined, snapshot.run, state.lastSeq);

  const handleOverrides = useCallback(
    (overrides: RatingOverrides) => {
      const run = snapshot.run;
      update((state) => ({ ...state, rating: { ...state.rating, overrides } }));
      if (client && run) {
        void EffectEx.runPromise(client.setOverrides(run, overrides)).catch((err: unknown) =>
          setError(err instanceof Error ? err.message : String(err)),
        );
      }
    },
    [client, snapshot.run, update],
  );

  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().group(
      'view',
      {
        label: ['view-filter.label', { ns: meta.profile.key }],
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value: view,
      },
      (group) => {
        group.action('all', { label: ['view-all.label', { ns: meta.profile.key }], icon: 'ph--list--regular' }, () =>
          setView('all'),
        );
        group.action(
          'findings',
          {
            label: ['view-findings.label', { ns: meta.profile.key }],
            icon: view === 'findings' ? 'ph--push-pin--fill' : 'ph--push-pin--regular',
          },
          () => setView('findings'),
        );
      },
    );
    builder.group(
      'mode',
      {
        label: ['view-mode.label', { ns: meta.profile.key }],
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value: mode,
      },
      (group) => {
        group.action(
          'results',
          { label: ['mode-results.label', { ns: meta.profile.key }], icon: 'ph--squares-four--regular' },
          () => setMode('results'),
        );
        group.action(
          'graph',
          { label: ['mode-graph.label', { ns: meta.profile.key }], icon: 'ph--graph--regular' },
          () => setMode('graph'),
        );
        group.action(
          'trace',
          { label: ['mode-trace.label', { ns: meta.profile.key }], icon: 'ph--tree-structure--regular' },
          () => setMode('trace'),
        );
      },
    );
    if (mode === 'graph' && focus) {
      builder.action(
        'subjects',
        { label: ['graph-subjects.label', { ns: meta.profile.key }], icon: 'ph--arrow-u-up-left--regular' },
        () => setFocus(undefined),
      );
    }
    if (state.rating.model && mode === 'results') {
      builder.action(
        'model',
        {
          label: ['model-toggle.label', { ns: meta.profile.key }],
          icon: showModel ? 'ph--sliders-horizontal--fill' : 'ph--sliders-horizontal--regular',
        },
        () => setShowModel((show) => !show),
      );
    }
    if (busy) {
      builder.action(
        'stop',
        { label: ['stop.label', { ns: meta.profile.key }], icon: 'ph--stop--regular' },
        handleStop,
      );
    }
    return builder.build();
  }, [view, mode, focus, showModel, state.rating.model, busy, handleStop]);

  const hasConnection = !!snapshot.connection || connections.length > 0;
  const budget = snapshot.budget ?? 'quick';
  const messages = useMemo(
    () => toMessages(session, state.events, state.results),
    [session, state.events, state.results],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={id} />
      </Panel.Header>
      <Panel.Body>
        <Layout.Grid cols={['24rem', 'fill']} classNames='h-full min-h-0'>
          <Layout.Flex column classNames='overflow-hidden border-e border-separator'>
            <Layout.Flex column gap='sm' classNames='p-trim-md border-b border-separator'>
              {snapshot.run && !editing ? (
                // Once it has run, the goal is a line to read, not a field: the thread is where it is steered.
                <Layout.Grid cols={['fill', 'min']} gap='sm' align='start'>
                  <Typography.Text lines={4} classNames='text-sm whitespace-normal' data-testid='lighthouse.goal'>
                    {snapshot.goal || session?.goal}
                  </Typography.Text>
                  <Button.Root
                    variant='ghost'
                    iconOnly
                    icon='ph--pencil-simple--regular'
                    label={t('edit-goal.label')}
                    onClick={() => setEditing(true)}
                  />
                </Layout.Grid>
              ) : (
                <Form.Root
                  schema={ResearchFormSchema}
                  values={{ goal: snapshot.goal || session?.goal || '', budget }}
                  autoSave
                  onSave={handleSave}
                >
                  <Form.Fields />
                </Form.Root>
              )}
              <span className='text-xs text-fg-subtle'>{formatBudget(BUDGETS[budget])}</span>
              {engines && engines.length > 0 && (
                <Collapsible.Root>
                  <Collapsible.Trigger>
                    {t('engines.label', { count: snapshot.engines?.length ?? 0 })}
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Layout.Grid cols={2} gap='xs' classNames='py-1 max-h-48 overflow-y-auto'>
                      {engines.map((engine) => (
                        <Input.Checkbox
                          key={engine.id}
                          label={engine.id}
                          checked={snapshot.engines?.includes(engine.id) ?? false}
                          onCheckedChange={({ checked }) => handleToggleEngine(engine.id, checked === true)}
                        />
                      ))}
                    </Layout.Grid>
                  </Collapsible.Content>
                </Collapsible.Root>
              )}
              {!hasConnection && <span className='text-sm text-fg-muted'>{t('no-connection.message')}</span>}
              {error && (
                <span className='text-sm text-error-text' role='alert'>
                  {error}
                </span>
              )}
              <Layout.Flex gap='sm' align='center' justify='between'>
                {session ? <Meters session={session} connected={state.connected} /> : <span />}
                <Button.Root
                  variant='primary'
                  icon='ph--play--regular'
                  label={t(snapshot.run ? 'run-again.label' : 'run.label')}
                  disabled={!hasConnection || !snapshot.goal.trim() || busy}
                  onClick={handleRun}
                  data-testid='lighthouse.run'
                />
              </Layout.Flex>
            </Layout.Flex>
            {snapshot.run && <ResearchThread messages={messages} busy={busy} disabled={!client} onSend={handleSend} />}
          </Layout.Flex>

          {mode === 'graph' ? (
            subjectGraph.graph && subjectGraph.graph.nodes.length > 0 ? (
              <SubjectGraph
                graph={subjectGraph.graph}
                selectedId={currentId}
                onSelect={handleSelect}
                onFocus={setFocus}
                onMore={subjectGraph.expand}
                classNames='h-full'
              />
            ) : (
              <Status.Empty classNames='h-full'>
                {t(
                  subjectGraph.error
                    ? 'graph-error.message'
                    : subjectGraph.loading
                      ? 'graph-loading.message'
                      : 'graph-empty.message',
                  { error: subjectGraph.error },
                )}
              </Status.Empty>
            )
          ) : mode === 'trace' ? (
            <TracePanel tree={trace.tree} loading={trace.loading} error={trace.error} />
          ) : (
            <Layout.Flex column classNames='h-full min-h-0'>
              {showModel && state.rating.model && (
                <Layout.Flex column classNames='max-h-[50%] overflow-y-auto border-b border-separator'>
                  <ModelPanel
                    model={state.rating.model}
                    overrides={state.rating.overrides}
                    items={items}
                    onChange={handleOverrides}
                    onClose={() => setShowModel(false)}
                  />
                </Layout.Flex>
              )}
              <Layout.Flex column grow>
                {tiles.length === 0 ? (
                  <Status.Empty classNames='h-full'>
                    {t(
                      view === 'findings'
                        ? 'no-findings.message'
                        : snapshot.run
                          ? 'no-results-yet.message'
                          : 'no-results.message',
                    )}
                  </Status.Empty>
                ) : (
                  <Masonry.Root Tile={TileAdapter} minColumnWidth={18} maxColumnWidth={24}>
                    <Masonry.Content padding>
                      <Masonry.Viewport
                        getId={(data) => data.tile.id}
                        items={tiles.map((tile) => ({
                          tile,
                          onToggleStar: handleToggleStar,
                          onVote: view === 'all' ? handleVote : undefined,
                        }))}
                        itemProps={itemProps}
                      />
                    </Masonry.Content>
                  </Masonry.Root>
                )}
              </Layout.Flex>
            </Layout.Flex>
          )}
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};

type TileProps = {
  tile: TileData;
  onToggleStar: (tile: TileData) => void;
  onVote?: (tile: TileData, vote: 'up' | 'down') => void;
};

const TileAdapter = ({ data }: { data: TileProps | undefined; index: number }) => {
  if (!data) {
    return null;
  }
  const { tile, onToggleStar, onVote } = data;
  return (
    <ResultCard
      card={tile.card}
      current={tile.current}
      aria-current={tile.current || undefined}
      starred={tile.starred}
      score={tile.rating?.score}
      missed={tile.rating?.missed}
      vote={tile.vote}
      onToggleStar={() => onToggleStar(tile)}
      onVote={onVote && tile.entity ? (vote) => onVote(tile, vote) : undefined}
    />
  );
};

ResearchArticle.displayName = 'ResearchArticle';
