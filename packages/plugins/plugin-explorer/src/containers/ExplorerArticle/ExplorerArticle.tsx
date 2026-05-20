//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Filter, Obj, type View } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useObject } from '@dxos/react-client/echo';
import { DxAnchorActivate, Icon, Panel, Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import {
  GraphClusterProjector,
  GraphForceProjector,
  type GraphLayout,
  type GraphLayoutNode,
  GraphLatticeProjector,
  type GraphProjector,
  type RenderNode,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphNode } from '@dxos/schema';

import { HierarchicalEdgeBundling, RadialTree, spaceGraphToHierarchy, type TreeNode } from '#components';
import { useGraphModel } from '#hooks';

import { getNodeFillForObject } from '../../util/node-color';

/** Visualization variants exposed by `ExplorerArticle`. */
export type ExplorerArticleVariant = 'force' | 'cluster' | 'bundle' | 'lattice';

const VARIANTS: { value: ExplorerArticleVariant; icon: string; label: string }[] = [
  {
    value: 'force',
    icon: 'ph--graph--regular',
    label: 'Force-directed',
  },
  {
    value: 'lattice',
    icon: 'ph--grid-four--regular',
    label: 'Lattice',
  },
  {
    value: 'cluster',
    icon: 'ph--asterisk-simple--regular',
    label: 'Radial cluster',
  },
  {
    value: 'bundle',
    icon: 'ph--circles-three-plus--regular',
    label: 'Edge bundling',
  },
];

export type ExplorerArticleProps = AppSurface.ObjectArticleProps<View.View>;

export const ExplorerArticle = ({ role, subject, variant }: ExplorerArticleProps) => {
  const [view] = useObject(subject);
  const db = view && Obj.getDatabase(view);
  const [filter, setFilter] = useState<Filter.Any>();
  const model = useGraphModel(db, filter);

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
    setFilter(builder.build(value).filter);
  }, []);

  // The `variant` prop is the initial value; user can toggle via the toolbar tabs.
  const [selected, setSelected] = useState<ExplorerArticleVariant>(isVariant(variant) ? variant : 'force');
  useEffect(() => {
    if (isVariant(variant)) {
      setSelected(variant);
    }
  }, [variant]);
  const handleVariantChange = useCallback((value: string) => {
    if (isVariant(value)) {
      setSelected(value);
    }
  }, []);

  const handleHoverPreview = useCallback((node: TreeNode | null, event?: MouseEvent) => {
    if (!node || !event) {
      return;
    }
    const obj = node.data;
    if (!obj || !Obj.isObject(obj)) {
      return;
    }
    const dxn = Obj.getDXN(obj)?.toString();
    if (!dxn) {
      return;
    }
    const target = event.target as HTMLElement;
    target.dispatchEvent(
      new DxAnchorActivate({
        dxn,
        label: Obj.getLabel(obj) ?? dxn,
        trigger: target,
        kind: 'card',
      }),
    );
  }, []);

  const showToolbar = role === 'article';

  if (!db || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {showToolbar && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <QueryEditor db={db} onChange={handleChange} />
            <Toolbar.ToggleGroup type='single' value={selected} onValueChange={handleVariantChange}>
              {VARIANTS.map(({ value, icon, label }) => (
                <Toolbar.ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
                  <Icon icon={icon} size={4} />
                </Toolbar.ToggleGroupItem>
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content>
        <Visualization variant={selected} model={model} onNodeHover={handleHoverPreview} />
      </Panel.Content>
    </Panel.Root>
  );
};

const isVariant = (value: unknown): value is ExplorerArticleVariant =>
  value === 'force' || value === 'cluster' || value === 'bundle' || value === 'lattice';

type VisualizationProps = {
  variant: ExplorerArticleVariant;
  model: NonNullable<ReturnType<typeof useGraphModel>>;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
};

const Visualization = ({ variant, model, onNodeHover }: VisualizationProps) => {
  if (variant === 'force' || variant === 'lattice' || variant === 'cluster') {
    return <ProjectorVisualization variant={variant} model={model} onNodeHover={onNodeHover} />;
  }

  return <HierarchyVisualization variant={variant} model={model} onNodeHover={onNodeHover} />;
};

type ProjectorVariant = 'force' | 'lattice' | 'cluster';
type ProjectorVisualizationProps = {
  variant: ProjectorVariant;
  model: NonNullable<ReturnType<typeof useGraphModel>>;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
};

const ANIMATION_DURATION_MS = 500;

/**
 * One persistent `<SVG.Graph>` mount for the three projector-based variants
 * (force / lattice / cluster). When the variant changes, a new projector is
 * instantiated and seeded with the previous projector's layout so node x/y
 * survive the swap — the new projector's `animate()` then tweens each node
 * from its current position to the new target.
 */
const ProjectorVisualization = ({ variant, model, onNodeHover }: ProjectorVisualizationProps) => {
  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphProjector<SpaceGraphNode> | undefined>();
  const projectorRef = useRef<GraphProjector<SpaceGraphNode> | undefined>(undefined);
  projectorRef.current = projector;

  // Recreate the projector when the variant changes. Pass the previous projector's
  // layout to the constructor so existing node x/y persist across the swap, then
  // the new projector's animate() tweens to its target positions.
  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const prev = projectorRef.current?.layout as GraphLayout<SpaceGraphNode> | undefined;
    setProjector(createProjector(variant, svgRef.current, prev));
  }, [variant]);

  const renderNode = useMemo(() => createRenderNode(variant), [variant]);

  const handleInspect = useCallback(
    (node: GraphLayoutNode<SpaceGraphNode>, event: MouseEvent) => {
      onNodeHover?.({ id: node.id, data: node.data?.data?.object }, event);
    },
    [onNodeHover],
  );

  return (
    <SVG.Root ref={svgRef}>
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
          model={model}
          projector={projector}
          renderNode={renderNode}
          drag={variant === 'force'}
          onInspect={handleInspect}
        />
      </SVG.Zoom>
    </SVG.Root>
  );
};

const createProjector = (
  variant: ProjectorVariant,
  ctx: SVGContext,
  prev?: GraphLayout<SpaceGraphNode>,
): GraphProjector<SpaceGraphNode> => {
  switch (variant) {
    case 'force':
      // Force has no `duration` — its own simulation drives motion via ticks.
      return new GraphForceProjector<SpaceGraphNode>(ctx, undefined, undefined, prev);
    case 'lattice':
      return new GraphLatticeProjector<SpaceGraphNode>(ctx, { duration: ANIMATION_DURATION_MS }, undefined, prev);
    case 'cluster':
      return new GraphClusterProjector<SpaceGraphNode>(
        ctx,
        {
          duration: ANIMATION_DURATION_MS,
          groupOf: (node: GraphLayoutNode<SpaceGraphNode>) => {
            const obj = node.data?.data?.object;
            return obj ? (Obj.getTypename(obj) ?? '(untyped)') : undefined;
          },
        },
        undefined,
        prev,
      );
  }
};

const createRenderNode = (variant: ProjectorVariant): RenderNode<SpaceGraphNode> | undefined => {
  switch (variant) {
    case 'force':
      return (group, node) => {
        const r = node.r ?? 6;
        group
          .append('circle')
          .attr('r', r)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
      };
    case 'lattice':
      return (group, node) => {
        const r = node.r ?? 6;
        const size = r * 2;
        group
          .append('rect')
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', size)
          .attr('height', size)
          .attr('rx', r * 0.3)
          .attr('ry', r * 0.3)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
      };
    case 'cluster':
      return (group, node) => {
        const obj = node.data?.data?.object as Obj.Unknown | undefined;
        const r = node.r ?? 4;
        // Synthetic root / group nodes have no underlying ECHO object; render them as
        // smaller, neutral circles so the hierarchy reads as "structure + leaves".
        group
          .append('circle')
          .attr('r', r)
          .style('cursor', 'pointer')
          .style('fill', obj ? getNodeFillForObject(obj) : 'var(--color-neutral-500)');
      };
  }
};

/**
 * Read from the model's reactive graph atom so the hierarchy is rebuilt as objects/relations stream in.
 */
const HierarchyVisualization = ({ variant, model, onNodeHover }: VisualizationProps) => {
  // Capture the atom snapshot so the memo's dep list explicitly tracks each push from the atom.
  const graphSnapshot = useAtomValue(model.graphAtom);
  const { tree, edges } = useMemo(() => spaceGraphToHierarchy(model), [model, graphSnapshot]);
  switch (variant) {
    case 'cluster':
      return <RadialTree data={tree} cluster onNodeHover={onNodeHover} />;
    case 'bundle':
      return <HierarchicalEdgeBundling data={tree} edges={edges} onNodeHover={onNodeHover} />;
    default:
      return null;
  }
};
