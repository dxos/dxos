//
// Copyright 2024 DXOS.org
//

import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';

import { useDynamicRef } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy, stripUndefined } from '@dxos/util';

import { Frame, FrameDragPreview, type FrameProps } from './Frame';
import { type DragPayloadData, type Item } from './Shape';
import { useBoundingSelection } from './hooks';
import { Markers, styles } from './styles';
import { GraphWrapper } from '../../graph';
import { useCanvasContext } from '../../hooks';
import {
  boundsContain,
  boundsToModel,
  createPathThroughPoints,
  createSnap,
  getBounds,
  getInputPoint,
  findClosestIntersection,
  type Rect,
  type Dimension,
  type Point,
} from '../../layout';
import { createGraph, createId } from '../../testing';
import { Grid } from '../Grid';
import { Toolbar, type ToolbarProps } from '../Toolbar';

const itemSize: Dimension = { width: 128, height: 64 };

export type EditorProps = {};

// TODO(burdon): Rename Canvas.
export const Editor = (_: EditorProps) => {
  const {
    debug,
    showGrid,
    snapToGrid,
    dragging,
    setDragging,
    setLinking,
    handleAction: handleDefaultAction,
  } = useCanvasContext();
  const snapPoint = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });
  const [graph] = useState(() => new GraphWrapper(createGraph(itemSize, snapPoint)));
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();

  // TODO(burdon): Replace with context state.
  const [itemDragging, setItemDragging] = useState<Pick<Item, 'id' | 'pos'>>();
  const [itemLinking, setItemLinking] = useState<{ source: { center: Point; bounds: Rect }; target: Point }>();

  // TODO(burdon): Create selection model.
  const [selectedNodes, setSelectedNodes] = useState<Record<string, boolean | undefined>>({});
  const [selectedEdges, setSelectedEdges] = useState<Record<string, boolean | undefined>>({});
  const selectedRef = useDynamicRef({ selectedNodes, selectedEdges });

  const handleSelectNode = useCallback<NonNullable<FrameProps['onSelect']>>((item, shift) => {
    if (shift) {
      setSelectedNodes((selected) => stripUndefined({ ...selected, [item.id]: selected[item.id] ? undefined : true }));
    } else {
      setSelectedNodes((selected) => stripUndefined({ [item.id]: selected[item.id] ? undefined : true }));
      setSelectedEdges({});
    }
  }, []);

  const handleSelectEdge = useCallback((id: string, shift: boolean) => {
    if (shift) {
      setSelectedEdges((selected) => stripUndefined({ ...selected, [id]: selected[id] ? undefined : true }));
    } else {
      setSelectedEdges((selected) => stripUndefined({ [id]: selected[id] ? undefined : true }));
      setSelectedNodes({});
    }
  }, []);

  //
  // Offset and scale.
  //
  const [{ scale, offset }, setTransform] = useState<{ scale: number; offset: Point }>({
    scale: 1,
    offset: { x: 0, y: 0 },
  });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (width && height) {
      setReady(true);
    }

    setTransform(({ scale }) => ({ scale, offset: { x: width / 2, y: height / 2 } }));
  }, [width, height]);
  const transformStyles = {
    // NOTE: Order is important.
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
  };

  //
  // Dragging state.
  //
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'Canvas' }),
    });
  }, [containerRef.current]);

  //
  // Events.
  //
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        setTransform(({ scale, offset }) => {
          const scaleSensitivity = 0.01;
          const newScale = scale * Math.exp(-event.deltaY * scaleSensitivity);

          const rect = containerRef.current.getBoundingClientRect();
          const pos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          const newOffset = {
            x: pos.x - (pos.x - offset.x) * (newScale / scale),
            y: pos.y - (pos.y - offset.y) * (newScale / scale),
          };

          return { scale: newScale, offset: newOffset };
        });
      } else {
        setTransform(({ offset: { x, y }, scale }) => ({
          offset: { x: x - event.deltaX, y: y - event.deltaY },
          scale,
        }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace': {
          handleAction({
            type: 'delete',
            nodes: Object.keys(selectedRef?.current.selectedNodes),
            edges: Object.keys(selectedRef?.current.selectedEdges),
          });
          break;
        }
      }
    };

    containerRef.current.addEventListener('wheel', handleWheel);
    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheel);
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, selectedRef, width, height]);

  //
  // Cursor/overlay.
  //
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const handleSelectionBounds = useCallback(
    (bounds: Rect | null) => {
      if (!bounds) {
        setSelectedNodes({});
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selection = boundsToModel(containerRef.current!.getBoundingClientRect(), scale, offset, bounds);
      const selected = graph.nodes.filter(
        ({ data: { pos } }) => boundsContain(selection, { ...pos, width: 0, height: 0 }), // Check center point.
      );
      setSelectedNodes(selected.reduce((acc, { data: { id } }) => ({ ...acc, [id]: true }), {}));
    },
    [overlaySvgRef, scale, offset],
  );

  const selectionBounds = useBoundingSelection(overlaySvgRef.current, handleSelectionBounds);
  const debugSelectionBounds =
    debug &&
    selectionBounds &&
    boundsToModel(overlaySvgRef.current!.getBoundingClientRect(), scale, offset, selectionBounds);

  //
  // Monitor dragging and linking.
  //
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const rect = overlaySvgRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, item } = source.data as DragPayloadData;
        switch (type) {
          case 'frame': {
            setItemDragging({ id: item.id, pos });
            break;
          }

          case 'anchor': {
            setItemLinking({ source: { center: item.pos, bounds: getBounds(item.pos, item.size) }, target: pos });
            break;
          }
        }
      },
      onDrop: ({ source, location }) => {
        const rect = overlaySvgRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, item } = source.data as DragPayloadData;
        switch (type) {
          case 'frame': {
            const item = source.data.item as Item;
            // TODO(burdon): Adjust for offset.
            // const pos = boundsToModelWithOffset(rect, scale, offset, item.pos, location.initial, location.current);
            item.pos = snapToGrid ? snapPoint(pos) : pos;
            setItemDragging(undefined);
            setDragging(undefined);
            break;
          }

          case 'anchor': {
            const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data.item as Item;
            let id = target?.id;
            if (!id) {
              id = createId();
              graph.addNode({ id, data: { id, pos: snapToGrid ? snapPoint(pos) : pos, size: itemSize } });
            }
            graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
            setItemLinking(undefined);
            setLinking(undefined);
            break;
          }
        }
      },
    });
  }, [overlaySvgRef, scale, offset, graph]);

  //
  // Actions
  //
  const handleAction = useCallback<NonNullable<ToolbarProps['onAction']>>(
    (action) => {
      if (handleDefaultAction(action)) {
        return true;
      }

      const { type } = action;
      switch (type) {
        // TODO(burdon): Animate.
        case 'center': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: 1 });
          break;
        }
        case 'zoom-in': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale * 1.5 });
          break;
        }
        case 'zoom-out': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale / 1.5 });
          break;
        }

        // TODO(burdon): Factor out graph handlers. Undo.
        case 'create': {
          const id = createId();
          graph.addNode({ id, data: { id, pos: { x: 0, y: 0 }, size: itemSize } });
          setSelectedNodes({});
          break;
        }
        case 'delete': {
          const { nodes, edges } = action;
          nodes?.forEach((node) => graph.removeNode(node));
          edges?.forEach((edge) => graph.removeEdge(edge));
          setSelectedNodes({});
          break;
        }
      }
    },
    [handleDefaultAction, graph, scale, width, height],
  );

  // Edges.
  const edges = getEdges(graph, itemDragging);
  if (itemLinking) {
    // TODO(burdon): Factor out with getEdges.
    const { center: p1, bounds: r1 } = itemLinking.source;
    const p2 = itemLinking.target;
    const i1 = r1 ? findClosestIntersection([p2, p1], r1) ?? p1 : p1;
    const i2 = p2;
    edges.push({ id: 'link', path: createPathThroughPoints([i1, i2]) });
  }

  return (
    <div role='none' ref={containerRef} tabIndex={0} className='flex grow relative overflow-hidden'>
      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* Selection overlay. */}
      <svg ref={overlaySvgRef} width='100%' height='100%' className='absolute left-0 top-0 cursor-crosshair'>
        <g>
          {selectionBounds && <rect {...selectionBounds} opacity={0.2} strokeWidth={2} className={styles.cursor} />}
        </g>
      </svg>

      {/* SVG content. */}
      {ready && (
        <>
          {/* HTML content. */}
          <div style={transformStyles} className='absolute left-0 top-0'>
            {graph.nodes.map(({ data: item }) => (
              <Frame
                key={item.id}
                item={item}
                scale={scale}
                selected={selectedNodes[item.id]}
                onSelect={handleSelectNode}
              />
            ))}
          </div>

          {/* SVG content. */}
          <svg width='100%' height='100%' className='absolute left-0 top-0 pointer-events-none'>
            <defs>
              <Markers />
            </defs>
            <g style={transformStyles}>
              {/* Edges. */}
              <g>
                {edges.map(({ id, path }) => (
                  <g key={id}>
                    {/* Hit area. */}
                    <path
                      d={path}
                      fill='none'
                      strokeWidth={8}
                      className={'stroke-transparent pointer-events-auto'}
                      onClick={(ev) => handleSelectEdge(id, ev.shiftKey)}
                    />
                    <path
                      d={path}
                      fill='none'
                      strokeWidth={1}
                      className={mx(styles.edge, selectedEdges[id] && styles.edgeSelected)}
                      // TODO(burdon): Edge style.
                      markerStart={id !== 'link' ? 'url(#circle)' : ''}
                      markerEnd={id !== 'link' ? 'url(#circle)' : ''}
                    />
                  </g>
                ))}
              </g>

              {/* Debugging. */}
              {debugSelectionBounds && (
                <g>
                  <rect {...debugSelectionBounds} fill='none' strokeWidth={4} className='stroke-red-500' />
                </g>
              )}
            </g>
          </svg>

          {/* Drag preview. */}
          {/* TODO(burdon): Move to frame? */}
          {dragging &&
            createPortal(
              <div style={transformStyles}>
                <FrameDragPreview item={dragging.item} />
              </div>,
              dragging.container,
            )}
        </>
      )}

      {/* UI. */}
      <div>
        <div className='fixed left-0 bottom-0 z-10'>
          <SyntaxHighlighter language='javascript' classNames='w-[300px] bg-base text-xs p-2 opacity-70'>
            {JSON.stringify(
              {
                debug,
                showGrid,
                snapToGrid,
                scale,
                offset,
                rect: overlaySvgRef.current?.getBoundingClientRect(),
                selectionBounds,
                selectedNodes,
                selectedEdges,
                dragging: itemDragging,
                linking: itemLinking,
              },
              null,
              2,
            )}
          </SyntaxHighlighter>
        </div>
        <div className='fixed right-2 top-2 z-10'>
          <Toolbar onAction={handleAction} />
        </div>
      </div>
    </div>
  );
};

// TODO(burdon): Factor out.
export const getEdges = (graph: GraphWrapper, dragging?: Pick<Item, 'id' | 'pos'>): { id: string; path: string }[] => {
  const getPos = (id: string): { center: Point; bounds: Rect } | undefined => {
    const node = graph.getNode(id);
    if (dragging?.id === id) {
      return { center: dragging.pos, bounds: getBounds(dragging.pos, node?.data.size) };
    }

    if (node) {
      return { center: node.data.pos, bounds: getBounds(node.data.pos, node.data.size) };
    }

    return undefined;
  };

  return graph.edges
    .map(({ id, source, target }) => {
      const { center: p1, bounds: r1 } = getPos(source) ?? {};
      const { center: p2, bounds: r2 } = getPos(target) ?? {};
      if (!p1 || !p2) {
        return null;
      }

      const i1 = r1 ? findClosestIntersection([p2, p1], r1) ?? p1 : p1;
      const i2 = r2 ? findClosestIntersection([p1, p2], r2) ?? p2 : p2;
      return { id, path: createPathThroughPoints([i1, i2]) };
    })
    .filter(isNotFalsy);
};
