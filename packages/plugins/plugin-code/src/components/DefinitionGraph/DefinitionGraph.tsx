//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type ReviewModel, reviewAnnotations, statusOf } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { CodeNamespace } from '../../namespace.ts';
import { type DecisionModel, buildChangelogGraph } from '../ChangelogGraph/index.ts';
import {
  type BlockRoles,
  DEFAULT_ROLES,
  type DefinitionModel,
  type SpecTexts,
  buildDefinitionGraph,
  diffDefinitionGraphs,
  groupDefinitions,
} from '../SpecModel/index.ts';
import { type CanvasLevel, DefinitionCanvas } from './DefinitionCanvas.tsx';
import { type DefinitionViewModel } from './DefinitionChip.tsx';
import { DefinitionMap } from './DefinitionMap.tsx';
import { DefinitionOutline } from './DefinitionOutline.tsx';
import { DefinitionRelated } from './DefinitionRelated.tsx';

/** Below this width (px) the whole spec is an outline rather than a map. */
const MAP_MIN_WIDTH = 720;

export type DefinitionLayout = 'canvas' | 'map' | 'outline';

export type DefinitionGraphProps = {
  /** The text of a `.mdl` spec; its `## Changelog` gives the decisions a block's view lists. */
  content: string;
  /** Other specs this one names by `github:` key, so their blocks can be described. */
  specs?: SpecTexts;
  /** Resolves `<spec id>#<item>` references to other specs' files; without it only `github:` keys name them. */
  index?: SpecIndex;
  /** The latest compliance review; its verdicts badge the blocks. */
  review?: ReviewModel;
  /** The base version of `content`; when given, each block is marked with what changed since it (diff mode). */
  base?: string;
  /** Roles of the spec's block kinds, over the ones derived from the graph. */
  roles?: BlockRoles;
  /** An external block opens its spec or code; a local one is shown in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
  /** The block, or on a canvas the cluster, it opens on; the whole spec by default. */
  defaultFocus?: string;
  /** The whole spec as a canvas, a map or an outline; by default a map when there is room for one. */
  layout?: DefinitionLayout;
};

/**
 * A spec's definitions, grouped by what names them. The whole spec is a map of clusters of groups where there is
 * room and an outline where there is not; either opens a block's related view, which centres on it and draws
 * everything it touches. As a canvas, it opens one level at a time: the clusters, one cluster's groups, then a block.
 * The trail of clusters and blocks opened is a breadcrumb back to the whole spec.
 */
export const DefinitionGraph = ({
  content,
  specs,
  index,
  review,
  base,
  roles = DEFAULT_ROLES,
  onActivate,
  defaultFocus,
  layout,
}: DefinitionGraphProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
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
  const grouping = useMemo(() => groupDefinitions(full, roles), [full, roles]);
  const decisions = useMemo(
    () => buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
    [content],
  );
  const view = useMemo<DefinitionViewModel>(
    () => ({
      byId: new Map(full.definitions.map((definition) => [definition.id, definition])),
      grouping,
      statusOf: (id) => statusOf(review, id),
      changeOf: (id) => diff?.changes.get(id),
    }),
    [full, grouping, review, diff],
  );

  const [trail, setTrail] = useState<string[]>(() => (defaultFocus ? [defaultFocus] : []));
  const clusterById = useMemo(() => new Map(grouping.clusters.map((cluster) => [cluster.id, cluster])), [grouping]);
  const top = trail.at(-1);
  const focus = top !== undefined && view.byId.has(top) ? top : undefined;
  const [selected, setSelected] = useState<string>();
  /** Opens a block or a cluster, cutting the trail back to it when it is already on it. */
  const push = useCallback(
    (id: string) =>
      setTrail((trail) => [...trail.slice(0, trail.indexOf(id) === -1 ? trail.length : trail.indexOf(id)), id]),
    [],
  );
  const handleOpen = useCallback(
    (id: string) => {
      const definition = view.byId.get(id);
      if (definition?.external) {
        onActivate?.(definition);
      } else if (definition && id !== top) {
        push(id);
      }
    },
    [view, top, onActivate, push],
  );
  const handleOpenCluster = useCallback((id: string) => id !== top && push(id), [top, push]);
  const crumbLabel = (id: string) => {
    const cluster = clusterById.get(id);
    return cluster === undefined
      ? id
      : cluster.hub === undefined
        ? t('definition-map.cluster.unshared.label')
        : t('definition-map.cluster.label', { hub: cluster.hub });
  };
  const handleShow = useCallback(
    (id: string) => {
      const definition = view.byId.get(id);
      definition && onActivate?.(definition);
    },
    [view, onActivate],
  );

  const root = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= MAP_MIN_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const shown: DefinitionLayout = layout ?? (wide ? 'map' : 'outline');
  const level: CanvasLevel =
    top === undefined
      ? { kind: 'spec' }
      : clusterById.has(top)
        ? { kind: 'cluster', cluster: top }
        : focus
          ? { kind: 'block', focus }
          : { kind: 'spec' };

  return (
    <Layout.Flex
      column
      classNames='dx-fill'
      ref={root}
      data-testid='definition-graph'
      data-layout={shown === 'canvas' ? shown : focus ? 'related' : shown}
    >
      <Layout.Flex align='center' gap='sm' classNames='px-2 py-1 min-h-[2.5rem]'>
        <Breadcrumb.Root aria-label={t('definition-graph.breadcrumb.label')} classNames='min-w-0'>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              {top !== undefined ? (
                <Breadcrumb.Link asChild>
                  <button type='button' onClick={() => setTrail([])} data-testid='definition-graph.crumb.spec'>
                    {t('definition-graph.crumb.spec.label')}
                  </button>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.Current>{t('definition-graph.crumb.spec.label')}</Breadcrumb.Current>
              )}
            </Breadcrumb.Item>
            {trail.map((id, position) => (
              <React.Fragment key={`${position}:${id}`}>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  {position === trail.length - 1 ? (
                    <Breadcrumb.Current classNames='font-mono'>{crumbLabel(id)}</Breadcrumb.Current>
                  ) : (
                    <Breadcrumb.Link asChild>
                      <button
                        type='button'
                        className='font-mono'
                        onClick={() => setTrail((trail) => trail.slice(0, position + 1))}
                        data-testid='definition-graph.crumb'
                      >
                        {crumbLabel(id)}
                      </button>
                    </Breadcrumb.Link>
                  )}
                </Breadcrumb.Item>
              </React.Fragment>
            ))}
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </Layout.Flex>
      <p className='px-2 pb-1 text-xs text-description' data-testid='definition-graph.hint'>
        {t(shown !== 'canvas' && focus ? 'definition-graph.hint.related' : `definition-graph.hint.${shown}`)}
      </p>
      {shown === 'canvas' ? (
        <DefinitionCanvas
          view={view}
          edges={full.edges}
          level={level}
          onOpenCluster={handleOpenCluster}
          onOpen={handleOpen}
        />
      ) : (
        <ScrollArea.Root orientation='vertical' classNames='dx-grow'>
          <ScrollArea.Viewport classNames='px-2 pb-2'>
            {focus ? (
              <DefinitionRelated
                view={view}
                edges={full.edges}
                decisions={decisions}
                focus={focus}
                onOpen={handleOpen}
                onShow={onActivate && handleShow}
              />
            ) : shown === 'map' ? (
              <DefinitionMap view={view} selected={selected} onSelect={setSelected} onOpen={handleOpen} />
            ) : (
              <DefinitionOutline view={view} onOpen={handleOpen} />
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      )}
    </Layout.Flex>
  );
};
