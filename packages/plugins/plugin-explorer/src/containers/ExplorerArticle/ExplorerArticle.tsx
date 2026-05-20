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
  type GraphLayoutNode,
  GraphLatticeProjector,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphNode } from '@dxos/schema';

import { ForceGraph } from '#components';
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
    value: 'cluster',
    icon: 'ph--asterisk-simple--regular',
    label: 'Radial cluster',
  },
  {
    value: 'bundle',
    icon: 'ph--circles-three-plus--regular',
    label: 'Edge bundling',
  },
  {
    value: 'lattice',
    icon: 'ph--grid-four--regular',
    label: 'Lattice',
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

// TODO(burdon): Create common renderer that works across all variants to support animation.

const Visualization = ({ variant, model, onNodeHover }: VisualizationProps) => {
  if (variant === 'force') {
    // ForceGraph subscribes to model.graphAtom internally; don't re-render the wrapper on every tick.
    return (
      <ForceGraph
        model={model}
        onInspect={(node, event) => onNodeHover?.({ id: node.id, data: node.data?.data?.object }, event)}
      />
    );
  }

  if (variant === 'lattice') {
    return <UnifiedLatticeVisualization model={model} onNodeHover={onNodeHover} />;
  }

  if (variant === 'cluster') {
    return <UnifiedClusterVisualization model={model} onNodeHover={onNodeHover} />;
  }

  return <HierarchyVisualization variant={variant} model={model} onNodeHover={onNodeHover} />;
};

/**
 * Lattice variant rendered via the shared `<SVG.Graph>` engine with a custom
 * `renderNode` slot for rounded rectangles colored by typename.
 */
const UnifiedLatticeVisualization = ({ model, onNodeHover }: Omit<VisualizationProps, 'variant'>) => {
  return (
    <ProjectedGraph
      model={model}
      projectorFactory={(ctx) => new GraphLatticeProjector(ctx)}
      onNodeHover={onNodeHover}
      renderNode={(group, node: GraphLayoutNode<SpaceGraphNode>) => {
        const r = node.r ?? 16;
        // Rounded square inscribed in the layout's radius.
        const size = r * 2;
        group
          .append('rect')
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', size)
          .attr('height', size)
          .attr('rx', r * 0.18)
          .attr('ry', r * 0.18)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
      }}
    />
  );
};

/**
 * Cluster variant rendered via the shared `<SVG.Graph>` engine.
 */
const UnifiedClusterVisualization = ({ model, onNodeHover }: Omit<VisualizationProps, 'variant'>) => {
  return (
    <ProjectedGraph
      model={model}
      projectorFactory={(ctx) =>
        new GraphClusterProjector(ctx, {
          groupOf: (node: GraphLayoutNode<SpaceGraphNode>) => {
            const obj = node.data?.data?.object;
            return obj ? (Obj.getTypename(obj) ?? '(untyped)') : undefined;
          },
        })
      }
      onNodeHover={onNodeHover}
      renderNode={(group, node: GraphLayoutNode<SpaceGraphNode>) => {
        const r = 4;
        group
          .append('circle')
          .attr('r', r)
          .style('cursor', 'pointer')
          .style('fill', getNodeFillForObject(node.data?.data?.object as Obj.Unknown | undefined));
      }}
    />
  );
};

type ProjectedGraphProps = {
  model: NonNullable<ReturnType<typeof useGraphModel>>;
  projectorFactory: (ctx: SVGContext) => any;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
  renderNode: (group: any, node: GraphLayoutNode<SpaceGraphNode>) => void;
};

/**
 * Hosts `<SVG.Graph>` with a projector instantiated from the given factory. Wires
 * `onInspect` into the standard preview-hover contract used by the other variants.
 */
const ProjectedGraph = ({ model, projectorFactory, onNodeHover, renderNode }: ProjectedGraphProps) => {
  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<any>();
  useEffect(() => {
    if (svgRef.current) {
      setProjector(projectorFactory(svgRef.current));
    }
    // Recreating the projector when the factory ref changes is acceptable; the
    // factory is recreated per parent render but never changes shape.
  }, []);

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
          onInspect={handleInspect}
        />
      </SVG.Zoom>
    </SVG.Root>
  );
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
