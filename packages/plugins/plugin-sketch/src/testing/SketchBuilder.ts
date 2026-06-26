//
// Copyright 2024 DXOS.org
//

//
// A minimal, chainable builder for tldraw (`tldraw.com/2`) canvas snapshots.
// Produces the record map stored in `Sketch.Canvas.content`, suitable for
// seeding stories/tests without hand-writing verbose tldraw records.
//

import { invariant } from '@dxos/invariant';

// TODO(burdon): Factor out and create a formal API.

export type Color =
  | 'black'
  | 'grey'
  | 'light-violet'
  | 'violet'
  | 'blue'
  | 'light-blue'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'light-green'
  | 'light-red'
  | 'red'
  | 'white';

export type Fill = 'none' | 'semi' | 'solid' | 'pattern' | 'fill';
export type Dash = 'draw' | 'solid' | 'dashed' | 'dotted';
export type Size = 's' | 'm' | 'l' | 'xl';
export type Font = 'draw' | 'sans' | 'serif' | 'mono';
export type Align = 'start' | 'middle' | 'end';
export type Geo =
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'rhombus'
  | 'oval'
  | 'cloud'
  | 'heart';

/** Common style props shared by all shapes. */
export type StyleProps = {
  color?: Color;
  fill?: Fill;
  dash?: Dash;
  size?: Size;
  font?: Font;
  text?: string;
  align?: Align;
};

/** Geometric shape (rectangle, ellipse, etc.). */
export type ShapeProps = StyleProps & {
  /** Friendly handle used to link shapes (e.g. as an arrow target). */
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
};

/** Free-standing text label. */
export type TextProps = Omit<ShapeProps, 'h' | 'fill' | 'dash'>;

/** Connector (arrow/line) between two shapes (or between explicit points). */
export type ConnectorProps = Omit<StyleProps, 'align'> & {
  id?: string;
  /** Handle of the source shape. */
  from?: string;
  /** Handle of the target shape. */
  to?: string;
  /** Explicit start point (used when `from` is omitted). */
  start?: Point;
  /** Explicit end point (used when `to` is omitted). */
  end?: Point;
};

export type Point = { x: number; y: number };

export type CanvasContent = Record<string, any>;

const PAGE_ID = 'page:page';

const DEFAULTS: {
  color: Color;
  fill: Fill;
  dash: Dash;
  size: Size;
  font: Font;
  align: Align;
  w: number;
  h: number;
} = {
  color: 'black',
  fill: 'none',
  dash: 'draw',
  size: 'm',
  font: 'draw',
  align: 'middle',
  w: 160,
  h: 120,
};

type Box = { id: string; x: number; y: number; w: number; h: number };

/**
 * Chainable builder for sketch (tldraw) canvas content.
 *
 * @example
 * ```ts
 * const content = new SketchBuilder()
 *   .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue' })
 *   .ellipse({ id: 'b', x: 320, y: 0, text: 'ECHO', color: 'green' })
 *   .arrow({ from: 'a', to: 'b' })
 *   .build();
 * ```
 */
export class SketchBuilder {
  readonly #records: CanvasContent = {};
  readonly #boxes = new Map<string, Box>();
  #shapeCount = 0;
  #bindingCount = 0;
  #indexCount = 0;

  /** Add a rectangle. */
  rectangle(props: ShapeProps = {}): this {
    return this.geo('rectangle', props);
  }

  /** Add an ellipse. */
  ellipse(props: ShapeProps = {}): this {
    return this.geo('ellipse', props);
  }

  /** Add a circle (an ellipse with equal width and height). */
  circle(props: ShapeProps = {}): this {
    const size = props.w ?? props.h ?? DEFAULTS.w;
    return this.geo('ellipse', { ...props, w: size, h: size });
  }

  /** Add an arbitrary geometric shape. */
  geo(geo: Geo, props: ShapeProps = {}): this {
    const { id, x = 0, y = 0, w = DEFAULTS.w, h = DEFAULTS.h, rotation = 0 } = props;
    const shapeId = this.#registerShape({ id, x, y, w, h });
    this.#records[shapeId] = {
      id: shapeId,
      typeName: 'shape',
      type: 'geo',
      x,
      y,
      rotation,
      index: this.#nextIndex(),
      parentId: PAGE_ID,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        geo,
        w,
        h,
        color: props.color ?? DEFAULTS.color,
        labelColor: DEFAULTS.color,
        fill: props.fill ?? DEFAULTS.fill,
        dash: props.dash ?? DEFAULTS.dash,
        size: props.size ?? DEFAULTS.size,
        font: props.font ?? DEFAULTS.font,
        align: props.align ?? DEFAULTS.align,
        verticalAlign: 'middle',
        url: '',
        growY: 0,
        text: props.text ?? '',
        scale: 1,
      },
    };

    return this;
  }

  /** Add a free-standing text label. */
  text(props: TextProps = {}): this {
    const { id, x = 0, y = 0, w = DEFAULTS.w, rotation = 0 } = props;
    const shapeId = this.#registerShape({ id, x, y, w, h: 0 });
    this.#records[shapeId] = {
      id: shapeId,
      typeName: 'shape',
      type: 'text',
      x,
      y,
      rotation,
      index: this.#nextIndex(),
      parentId: PAGE_ID,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        color: props.color ?? DEFAULTS.color,
        size: props.size ?? DEFAULTS.size,
        font: props.font ?? DEFAULTS.font,
        textAlign: props.align ?? DEFAULTS.align,
        w,
        text: props.text ?? '',
        scale: 1,
        autoSize: true,
      },
    };

    return this;
  }

  /** Add an arrow, optionally bound to source/target shapes so it tracks them. */
  arrow(props: ConnectorProps = {}): this {
    return this.#connector('arrow', props);
  }

  /** Add a line between two shapes (or explicit points). */
  line(props: ConnectorProps = {}): this {
    return this.#connector('line', props);
  }

  /** Build the canvas content record map. */
  build(): CanvasContent {
    return {
      'document:document': { gridSize: 10, name: '', meta: {}, id: 'document:document', typeName: 'document' },
      [PAGE_ID]: { meta: {}, id: PAGE_ID, name: 'Page 1', index: 'a1', typeName: 'page' },
      ...this.#records,
    };
  }

  #connector(type: 'arrow' | 'line', props: ConnectorProps): this {
    const from = props.from ? this.#boxes.get(props.from) : undefined;
    const to = props.to ? this.#boxes.get(props.to) : undefined;
    // A referenced handle that resolves to nothing is a typo; fail rather than emit a misplaced connector.
    invariant(!props.from || from, `unknown source shape: ${props.from}`);
    invariant(!props.to || to, `unknown target shape: ${props.to}`);
    const start = from ? center(from) : (props.start ?? { x: 0, y: 0 });
    const end = to ? center(to) : (props.end ?? { x: DEFAULTS.w, y: 0 });

    const shapeId = this.#registerShape({ id: props.id, x: start.x, y: start.y, w: 0, h: 0 });
    const relativeEnd = { x: end.x - start.x, y: end.y - start.y };
    const style = {
      color: props.color ?? DEFAULTS.color,
      dash: props.dash ?? DEFAULTS.dash,
      size: props.size ?? DEFAULTS.size,
    };

    if (type === 'arrow') {
      this.#records[shapeId] = {
        id: shapeId,
        typeName: 'shape',
        type: 'arrow',
        x: start.x,
        y: start.y,
        rotation: 0,
        index: this.#nextIndex(),
        parentId: PAGE_ID,
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          ...style,
          labelColor: DEFAULTS.color,
          fill: props.fill ?? DEFAULTS.fill,
          font: props.font ?? DEFAULTS.font,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
          start: { x: 0, y: 0 },
          end: relativeEnd,
          bend: 0,
          text: props.text ?? '',
          labelPosition: 0.5,
          scale: 1,
        },
      };

      // Bindings make the arrow track its bound shapes (tldraw recomputes terminals).
      if (from) {
        this.#binding(shapeId, from.id, 'start');
      }
      if (to) {
        this.#binding(shapeId, to.id, 'end');
      }
    } else {
      this.#records[shapeId] = {
        id: shapeId,
        typeName: 'shape',
        type: 'line',
        x: start.x,
        y: start.y,
        rotation: 0,
        index: this.#nextIndex(),
        parentId: PAGE_ID,
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          ...style,
          spline: 'line',
          points: {
            a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
            a2: { id: 'a2', index: 'a2', x: relativeEnd.x, y: relativeEnd.y },
          },
          scale: 1,
        },
      };
    }

    return this;
  }

  #binding(arrowId: string, shapeId: string, terminal: 'start' | 'end'): void {
    const bindingId = `binding:b${++this.#bindingCount}`;
    this.#records[bindingId] = {
      id: bindingId,
      typeName: 'binding',
      type: 'arrow',
      fromId: arrowId,
      toId: shapeId,
      meta: {},
      props: {
        terminal,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
    };
  }

  #registerShape(box: { id?: string; x: number; y: number; w: number; h: number }): string {
    // Skip autogenerated ids that collide with an explicit one (e.g. a user-supplied `s1`).
    let shapeId = box.id ? `shape:${box.id}` : `shape:s${++this.#shapeCount}`;
    while (!box.id && this.#records[shapeId]) {
      shapeId = `shape:s${++this.#shapeCount}`;
    }
    const handle = box.id ?? shapeId;
    // The id is the record-map key; reusing one would silently overwrite the earlier shape.
    invariant(!this.#records[shapeId] && !this.#boxes.has(handle), `duplicate shape id: ${handle}`);
    this.#boxes.set(handle, { id: shapeId, x: box.x, y: box.y, w: box.w, h: box.h });
    return shapeId;
  }

  #nextIndex(): string {
    return `a${++this.#indexCount}`;
  }
}

const center = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
