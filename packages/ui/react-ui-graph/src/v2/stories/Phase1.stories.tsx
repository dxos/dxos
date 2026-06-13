//
// Copyright 2026 DXOS.org
//

import '../../../styles/graph.css';

import { RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo, useRef, useState } from 'react';

import { GraphModel } from '@dxos/graph';
import { ForceProjector, TypeRegistry, createPath, type SemanticPointerEvent } from '@dxos/graph-engine';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { GraphRoot } from '../GraphRoot';
import { GraphSurface } from '../GraphSurface';
import { useEngine } from '../hooks/use-engine';

type Person = { name: string };

const NODE_TYPE = 'person';

const buildModel = (registry: any) => {
  const model = new GraphModel.ReactiveGraphModel<any, any>(registry);
  ['alice', 'bob', 'carol', 'dave', 'eve'].forEach((id) =>
    model.addNode({ id, type: NODE_TYPE, data: { name: id } as Person }),
  );
  model.addEdge({ source: 'alice', target: 'bob' });
  model.addEdge({ source: 'alice', target: 'carol' });
  model.addEdge({ source: 'bob', target: 'dave' });
  model.addEdge({ source: 'carol', target: 'eve' });
  return model;
};

const Phase1Story = () => {
  const registry = useContext(RegistryContext);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [hoverId, setHoverId] = useState<string | undefined>();
  const selectedRef = useRef<string | undefined>(undefined);
  const hoverRef = useRef<string | undefined>(undefined);
  selectedRef.current = selectedId;
  hoverRef.current = hoverId;
  const model = useMemo(() => buildModel(registry), [registry]);

  // Stable across renders: the registry's draw fn reads live state via refs so the
  // engine doesn't need to be re-built on every selection/hover change.
  const typeRegistry = useMemo(() => {
    const r = new TypeRegistry<Person>();
    r.registerNode(NODE_TYPE, {
      draw(ctx, node) {
        const rr = node.r ?? 12;
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const isSelected = selectedRef.current === node.id;
        const isHovered = hoverRef.current === node.id;
        const p = createPath();
        p.arc(x, y, rr, 0, Math.PI * 2);
        p.close();
        ctx.setFill(isSelected ? '#1d4ed8' : isHovered ? '#60a5fa' : '#3b82f6');
        ctx.fill(p);
        ctx.setStroke('#1e3a8a');
        ctx.setLineWidth(1.5);
        ctx.stroke(p);
      },
      bounds(node) {
        const rr = node.r ?? 12;
        return { x: (node.x ?? 0) - rr, y: (node.y ?? 0) - rr, width: rr * 2, height: rr * 2 };
      },
      hit([px, py], node) {
        const rr = node.r ?? 12;
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        return dx * dx + dy * dy <= rr * rr;
      },
      capabilities: { hoverable: true, selectable: true },
    });
    return r;
  }, []);

  const projector = useMemo(() => new ForceProjector({ linkDistance: 80 }), []);
  const engine = useEngine({ model, registry: typeRegistry, projector });

  const onSemanticEvent = (e: SemanticPointerEvent) => {
    switch (e.type) {
      case 'select':
        setSelectedId(e.entityId);
        break;
      case 'hover-enter':
        setHoverId(e.entityId);
        break;
      case 'hover-leave':
        setHoverId((current) => (current === e.entityId ? undefined : current));
        break;
    }
  };

  return (
    <div className='absolute inset-0 bg-baseSurface'>
      <GraphRoot engine={engine}>
        <GraphSurface className='absolute inset-0 w-full h-full' onSemanticEvent={onSemanticEvent} />
      </GraphRoot>
    </div>
  );
};

const meta: Meta = {
  title: 'react-ui-graph/v2/Phase1',
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
};
export default meta;

type Story = StoryObj;

/**
 * Force-directed layout rendered to Canvas with the new v2 engine.
 * Click a node → blue darkens. Hover a node → blue lightens. Wheel to zoom; drag to pan.
 * No HTML islands in this story (Task 24 deferred).
 */
export const ForceCanvas: Story = { render: () => <Phase1Story /> };
