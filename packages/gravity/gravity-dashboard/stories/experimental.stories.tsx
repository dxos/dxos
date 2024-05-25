//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Knobs, KnobsProvider, useButton } from '@dxos/esbuild-book-knobs';
import {
  type D3Callable,
  type D3Selection,
  type Fraction,
  FullScreen,
  Grid,
  SVG,
  type SVGContext,
  SVGContextProvider,
  useSvgContext,
  useZoom,
} from '@dxos/gem-core';
import { faker } from '@dxos/random';

// TODO(burdon): Package name/title.
export default {
  title: 'gravity-dashboard/experimental',
};

// TODO(burdon): Generator for Kube/Bot data structure with dynamic mutation.
// TODO(burdon): Illustrate swarm connections between bots.

type Kube = {
  id: string;
  bots: {
    id: string;
    spaceKey?: string;
  }[];
};

const styles = {
  svg: css`
    circle {
      fill: none;
      stroke: #333;
      stroke-width: 0.5px;
    }

    circle.outer {
      stroke: #ccc;
      stroke-dasharray: 1px;
    }

    g.kube {
      > circle {
        fill: #f9f9f9;
        stroke: lightblue;
        stroke-width: 1px;
        stroke-dasharray: 1px;
      }
    }

    g.bot {
      circle {
        fill: lightblue;
        stroke: darkblue;
      }
      text {
        font-size: 5px;
        font-family: monospace;
        fill: #666;
      }
    }
  `,

  knobs: css`
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 8px;
    border: 1px solid #ccc;
  `,
};

/**
 * Create single child element.
 */
// TODO(burdon): Factor out.
const createOne =
  (type: string, className: string, callable?: D3Callable): D3Callable =>
  (el) => {
    const result = el
      .selectAll(`${type}.${className}`)
      .data((d) => [d])
      .join((enter) => enter.append(type).attr('class', className));

    if (callable) {
      result.call(callable);
    }
  };

/**
 * Arranges group elements in a circle.
 */
class CircularLayout {
  // Map of previous angular positions.
  private _map = new Map<string, number>();
  private _radius: Fraction = [1, 1];

  // prettier-ignore
  constructor(
    private readonly _context: SVGContext,
    private readonly _duraction = 1000,
  ) {}

  get layout() {
    return this.doLayout.bind(this);
  }

  initialize(radius: Fraction) {
    this._radius = radius;
    return this;
  }

  doLayout(groups: D3Selection) {
    const objects = groups.data();
    const a = (2 * Math.PI) / objects.length;
    const r = this._context.scale.model.toValue(this._radius);

    // Remove positions for stale objects.
    const map = new Map<string, number>();
    objects.forEach((obj) => map.set(obj.id, this._map.get(obj.id)));
    this._map = map;

    // Layout groups.
    groups.each((d, i, nodes) => {
      const previous = this._map.get(d.id) ?? (i + 1) * a;
      const transition = d3
        .select(nodes[i])
        .transition()
        .duration(this._duraction)
        .attrTween('transform', () => {
          const arc = d3.interpolateNumber(previous, i * a);
          return (t) => {
            const a = arc(t);
            this._map.set(d.id, a);
            const x = Math.sin(a) * r;
            const y = Math.cos(a) * r;
            return `translate(${x},${-y})`;
          };
        })
        // Finish if interrupted.
        .attr('opacity', 1);

      if (this._map.get(d.id) === undefined) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        transition.attrTween('opacity', () => d3.interpolate(0, 1));
      }
    });
  }
}

/**
 * Layout bots within KUBE node.
 */
class KubeLayout {
  // TODO(burdon): Tween radius.
  private _radius: Fraction = [3, 1];
  private readonly _kubeLayoutMap = new Map<string, CircularLayout>();

  constructor(private readonly _context: SVGContext) {}

  get layout() {
    return this.doLayout.bind(this);
  }

  initialize(radius: Fraction) {
    this._radius = radius;
    return this;
  }

  doLayout(group: D3Selection) {
    const r2 = this._context.scale.model.toValue(this._radius);

    // Outline.
    group.call(createOne('circle', 'main', (el) => el.attr('r', r2)));

    // Draw bots.
    group.each((d, i, nodes) => {
      let layout = this._kubeLayoutMap.get(d.id);
      if (!layout) {
        layout = new CircularLayout(this._context, 500).initialize(this._radius);
        this._kubeLayoutMap.set(d.id, layout);
      }

      d3.select(nodes[i])
        .selectAll<SVGGElement, Kube>('g.bot')
        .data(
          (d: Kube) => d.bots,
          (d) => d.id,
        )
        .join(
          (enter) => enter.append('g').attr('class', 'bot'),
          (update) => update,
          (remove) =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            remove
              .call((el) => el.selectAll('text').remove())
              .transition()
              .duration(500)
              .attr('transform', 'translate(0,0)')
              .attrTween('opacity', () => d3.interpolate(1, 0) as any)
              .remove(),
        )

        // Layout bots.
        .call(layout.layout)

        .call((el) => {
          const left = false;

          // TODO(burdon): Get left/right.
          // NOTE: getBoundingClientRect not available under rendered (attached to DOM).
          // console.log(el.node().parentNode.getBBox());

          el.selectAll('circle')
            .data((d) => [d])
            .join('circle')
            .attr('r', 1);

          el.selectAll('text')
            .data((d) => [d])
            .join('text')
            .attr('dx', left ? -4 : 4)
            .style('text-anchor', (d, i, nodes) => {
              // console.log(nodes[i].parentNode.parentNode.getBoundingClientRect());
              return 'start';
            })
            .style('dominant-baseline', 'central')
            .text((d) => d.id.substring(0, 4));
        });
    });
  }
}

/**
 * Layout network of KUBE nodes.
 */
class MeshLayout {
  private readonly _circleLayout: CircularLayout;
  private readonly _kubeLayout: KubeLayout;

  constructor(
    private readonly _context: SVGContext,
    private readonly _radius: Fraction = [5, 2],
  ) {
    this._circleLayout = useMemo(() => new CircularLayout(this._context).initialize(this._radius), []);
    this._kubeLayout = useMemo(() => new KubeLayout(this._context).initialize([3, 5]), []);
  }

  get layout() {
    return this.doLayout.bind(this);
  }

  // NOTE: Don't do transitions inside join.
  doLayout(group: D3Selection, objects: Kube[]) {
    group.call(createOne('circle', 'outer', (el) => el.attr('r', this._context.scale.model.toValue(this._radius))));

    group
      .selectAll<SVGGElement, Kube>('g.kube')
      .data(objects, (d: Kube) => d.id)
      .join(
        (enter) =>
          enter
            .append('g')
            .attr('class', 'kube')
            .call(this._kubeLayout.layout)
            .call((el) =>
              // TODO(burdon): Change eslint config for D3.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              el
                .selectAll('*')
                .transition()
                .duration(1000)
                .attrTween('opacity', () => d3.interpolate(0, 1) as any),
            ),
        (update) => update.call(this._kubeLayout.layout),
        (remove) =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          remove
            .transition()
            .duration(1000)
            .attrTween('opacity', () => d3.interpolate(1, 0) as any)
            .remove(),
      )

      // Layout after created.
      .call(this._circleLayout.layout);
  }
}

//
// Main layout.
//

const createObjects = (n = 5): Kube[] =>
  Array.from({ length: n }).map(() => ({
    id: `kube-${faker.string.uuid()}`,
    bots: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => ({ id: faker.string.uuid() })),
  }));

const Container = () => {
  const context = useSvgContext();
  const zoom = useZoom({ extent: [1, 8] });
  const groupRef = useRef();

  const layout = new MeshLayout(context);
  const [objects, setObjects] = useState<Kube[]>(() => createObjects(5));

  useButton('Reset', () => setObjects([]));
  useButton('Add', () => setObjects((objects) => [...objects, ...createObjects(1)]));
  useButton('Remove', () =>
    setObjects((objects) => objects.map((obj) => (faker.datatype.boolean() ? obj : undefined)).filter(Boolean)),
  );
  useButton('Mutate', () => {
    setObjects((objects) =>
      objects.map(({ bots, ...rest }) => ({
        bots: faker.datatype.boolean()
          ? bots
          : [
              ...bots.map((bot) => (faker.number.int(10) > 7 ? bot : undefined)).filter(Boolean),
              ...Array.from({ length: faker.number.int(4) }).map(() => ({
                id: faker.string.uuid(),
              })),
            ],
        ...rest,
      })),
    );
  });

  useEffect(() => {
    // console.log(JSON.stringify(objects, undefined, 2));
    d3.select(groupRef.current).call(layout.layout, objects);
  }, [objects]);

  return (
    <g ref={zoom.ref}>
      <g ref={groupRef} className={styles.svg} />
    </g>
  );
};

export const Primary = () => {
  const showGrid = true;

  return (
    <FullScreen>
      <KnobsProvider>
        <SVGContextProvider>
          <SVG>
            {showGrid && <Grid axis />}
            <Container />
          </SVG>
        </SVGContextProvider>
        <Knobs className={styles.knobs} />
      </KnobsProvider>
    </FullScreen>
  );
};
