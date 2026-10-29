//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Query, Ref, Tag } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { useSelection } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';

import { type Entity } from '#client';
import { RelationsPanel, ResultDetail, areaNoteOf } from '#components';
import {
  useChildResearch,
  useExtensionNodes,
  useExtensions,
  useLighthouseClient,
  useSession,
  useSubjectGraph,
} from '#hooks';
import { meta } from '#meta';
import { applyOverrides, applyVote, matchPicks, nextVote, rateAll, toCard, withLinkedGeo } from '#model';
import { Finding, LighthouseOperation, Research } from '#types';

import { findingEntity } from '../../util/index.ts';

export type ResultArticleProps = AppSurface.ArticleProps<string, {}, Research.Research>;

/**
 * Companion to a Research: the selected result's detail. The result is read live from the session (the article's
 * stream, shared), with its provenance from the graph; a kept Finding stands in when the session no longer has it.
 */
export const ResultArticle = ({ role, companionTo: research, attendableId }: ResultArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [snapshot] = useObject(research);
  const db = Obj.getDatabase(research);
  const contextId = attendableId ?? Obj.getURI(research);
  const iri = useSelection(contextId, 'single');

  const client = useLighthouseClient(research);
  const extensions = useExtensions(client);
  const { state, update } = useSession(client, snapshot.run);

  const feed = research.feed?.target;
  const findings = useQuery(
    db,
    feed ? Query.select(Filter.type(Finding.Finding)).from(feed) : Query.select(Filter.nothing()),
  );
  const [starredTag] = useQuery(db, Filter.foreignKeys(Tag.Tag, [Research.STARRED_TAG]));
  const starredUri = starredTag ? Obj.getURI(starredTag).toString() : undefined;
  const kept = useMemo(() => findings.filter((finding) => finding.iri === iri), [findings, iri]);
  const starred = kept.some((finding) => Research.isStarred(research, finding.id, starredUri));

  const live = useMemo(() => state.results.find((entity) => entity.id === iri), [state.results, iri]);
  const [graph, setGraph] = useState<Entity>();
  useEffect(() => {
    setGraph(undefined);
    if (!client || !iri) {
      return;
    }
    let current = true;
    void EffectEx.runPromise(client.getEntity(iri).pipe(Effect.option)).then((result) => {
      if (current && result._tag === 'Some' && result.value) {
        setGraph(result.value);
      }
    });
    return () => {
      current = false;
    };
  }, [client, iri, live]);

  const entity = useMemo((): Entity | undefined => {
    const finding = kept.at(-1);
    const base: Entity | undefined = live ?? (finding && findingEntity(finding));
    // A graph node that is no result of this session (a person's employer, a co-author) is read from the graph alone.
    return base && graph
      ? { ...base, props: { ...base.props, ...graph.props }, provenance: graph.provenance }
      : (base ?? graph);
  }, [live, kept, graph]);

  const rating = useMemo(() => {
    if (!entity || !state.rating.model) {
      return undefined;
    }
    return rateAll(
      applyOverrides(state.rating.model, state.rating.overrides),
      withLinkedGeo(state.results, state.results),
    ).get(entity.id);
  }, [entity, state.rating, state.results]);

  // The companion says when the result lies outside the person's drawn areas, like its card does.
  const areaNote = useMemo(
    () =>
      entity
        ? areaNoteOf(withLinkedGeo([entity], state.results)[0] ?? entity, state.rating.overrides?.areas)
        : undefined,
    [entity, state.results, state.rating.overrides],
  );
  const why = useMemo(
    () =>
      matchPicks(state.session?.report?.picks ?? [], state.results).find((pick) => pick.entity?.id === iri)?.pick.why ??
      kept.find((finding) => finding.why)?.why,
    [state.session?.report, state.results, iri, kept],
  );

  const applicable = useMemo(
    () =>
      entity
        ? (extensions ?? []).filter((extension) => extension.appliesTo.some((type) => entity.types.includes(type)))
        : [],
    [extensions, entity],
  );
  // Extension nodes and deep research are re-read after a read lands; a deep read's child run is kept until listed.
  const [extensionVersion, setExtensionVersion] = useState(0);
  const [childRuns, setChildRuns] = useState<Record<string, string>>({});
  const extensionNodes = useExtensionNodes(client, iri, applicable, extensionVersion);
  const childResearch = useChildResearch(client, iri, applicable, childRuns);
  const deepResearch = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(childResearch).map(([extension, { session, items }]) => [
          extension,
          { status: session.status, busy: session.busy, items },
        ]),
      ),
    [childResearch],
  );
  const relations = useSubjectGraph(client, iri ? [iri] : undefined, { depth: 1, limit: 40 });

  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const invoke = useCallback(
    async <I, O>(operation: Operation.Definition<I, O>, input: I): Promise<O | undefined> => {
      const { data, error } = await invokePromise(operation, ...([input, { spaceId: db?.spaceId }] as const));
      if (error) {
        log.catch(error);
      }
      return data;
    },
    [invokePromise, db],
  );

  const card = useMemo(() => (entity ? toCard(entity) : undefined), [entity]);
  const vote = iri ? state.rating.feedback[iri] : undefined;

  const handleVote = useCallback(
    (clicked: 'up' | 'down') => {
      if (!iri) {
        return;
      }
      const next = nextVote(vote, clicked);
      update((state) => applyVote(state, iri, next));
      void invoke(LighthouseOperation.VoteFinding, { research: Ref.make(research), iri, vote: next });
    },
    [iri, vote, update, invoke, research],
  );

  const handleToggleStar = useCallback(() => {
    if (!entity || !card) {
      return;
    }
    void invoke(LighthouseOperation.KeepFinding, {
      research: Ref.make(research),
      finding: {
        iri: entity.id,
        title: card.title,
        ...(card.url ? { url: card.url } : {}),
        types: entity.types,
        images: card.images,
        properties: entity.props,
        ...(rating ? { score: rating.score } : {}),
        ...(why ? { why } : {}),
      },
      starred: !starred,
    });
  }, [entity, card, rating, why, starred, invoke, research]);

  const handleExtend = useCallback(
    (extension: string, deep: boolean) => {
      if (!iri) {
        return;
      }
      const key = deep ? `${extension}:deep` : extension;
      setBusy((busy) => ({ ...busy, [key]: true }));
      void invoke(LighthouseOperation.ExtendFinding, { research: Ref.make(research), iri, extension, deep })
        .then((result) => {
          if (result?.child) {
            const child = result.child;
            setChildRuns((runs) => ({ ...runs, [extension]: child }));
          }
          setExtensionVersion((version) => version + 1);
        })
        .finally(() => setBusy((busy) => ({ ...busy, [key]: false })));
    },
    [iri, invoke, research],
  );

  const handleSelect = useCallback(
    (selected: string) => {
      void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single', id: selected } });
    },
    [invokePromise, contextId],
  );

  const handleClose = useCallback(() => {
    void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single', id: undefined } });
  }, [invokePromise, contextId]);

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {entity && card && iri ? (
              <Layout.Flex column>
                <ResultDetail
                  entity={entity}
                  areaNote={areaNote}
                  card={card}
                  rating={rating}
                  starred={starred}
                  vote={vote}
                  why={why}
                  extensions={applicable}
                  extensionNodes={extensionNodes}
                  research={deepResearch}
                  busy={busy}
                  onToggleStar={handleToggleStar}
                  onVote={snapshot.run ? handleVote : undefined}
                  onExtend={snapshot.run ? handleExtend : undefined}
                  onClose={handleClose}
                />
                <RelationsPanel graph={relations.graph} iri={iri} onSelect={handleSelect} />
              </Layout.Flex>
            ) : (
              <Status.Empty classNames='h-full'>{t('no-result-selected.message')}</Status.Empty>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

ResultArticle.displayName = 'ResultArticle';
