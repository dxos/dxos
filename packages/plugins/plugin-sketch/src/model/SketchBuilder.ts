//
// Copyright 2024 DXOS.org
//

//
// A minimal, chainable builder for tldraw (`tldraw.com/2`) canvas records.
// Produces the record map stored in `Sketch.Canvas.content`. Used directly to seed
// stories/tests (`build()`), and by the scene renderer (`render.ts`) to compile the
// neutral scene DSL into records merged into an existing canvas (`records()`).
//

import { invariant } from '@dxos/invariant';

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

/** Open or closed path through explicit points. */
export type PathProps = Omit<StyleProps, 'align'> & {
  id?: string;
  points: readonly Point[];
  /** Smooth (cubic spline) instead of straight segments. */
  smooth?: boolean;
  /** Close the path back to the first point. */
  closed?: boolean;
};

export type Point = { x: number; y: number };

export type CanvasContent = Record<string, any>;

export const PAGE_ID = 'page:page';
export const DOCUMENT_ID = 'document:document';

export type BuilderOptions = {
  /** Fractional-index counter seed; pass a value past existing content when merging. */
  indexStart?: number;
  /** Per-shape meta, keyed by handle; merged into each generated record's `meta`. */
  metaFor?: (handle: string) => Record<string, any>;
};

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
  readonly #metaFor?: (handle: string) => Record<string, any>;
  #shapeCount = 0;
  #bindingCount = 0;
  #indexCount: number;

  constructor(options: BuilderOptions = {}) {
    this.#indexCount = options.indexStart ?? 0;
    this.#metaFor = options.metaFor;
  }

  /**
   * Register a shape that already exists on the canvas (its bounding box in canvas px)
   * so connectors added by this builder can bind to it.
   */
  external(handle: string, box: { x: number; y: number; w: number; h: number }, shapeId?: string): this {
    invariant(!this.#boxes.has(handle), `duplicate shape id: ${handle}`);
    this.#boxes.set(handle, { id: shapeId ?? `shape:${handle}`, ...box });
    return this;
  }

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
      meta: this.#meta(id),
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
      meta: this.#meta(id),
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

  /** Add a path (open or closed, straight or smooth) through explicit points. */
  path(props: PathProps): this {
    const { id, smooth, closed } = props;
    const source = closed && props.points.length > 1 ? [...props.points, props.points[0]] : [...props.points];
    invariant(source.length >= 2, 'path requires at least two points');
    const origin = source[0];
    const xs = source.map((point) => point.x);
    const ys = source.map((point) => point.y);
    const shapeId = this.#registerShape({
      id,
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    });
    this.#records[shapeId] = {
      id: shapeId,
      typeName: 'shape',
      type: 'line',
      x: origin.x,
      y: origin.y,
      rotation: 0,
      index: this.#nextIndex(),
      parentId: PAGE_ID,
      isLocked: false,
      opacity: 1,
      meta: this.#meta(id),
      props: {
        color: props.color ?? DEFAULTS.color,
        dash: props.dash ?? DEFAULTS.dash,
        size: props.size ?? DEFAULTS.size,
        spline: smooth ? 'cubic' : 'line',
        points: Object.fromEntries(
          source.map((point, i) => [
            `a${i + 1}`,
            { id: `a${i + 1}`, index: `a${i + 1}`, x: point.x - origin.x, y: point.y - origin.y },
          ]),
        ),
        scale: 1,
      },
    };

    return this;
  }

  /** Build the full canvas snapshot (document + page + records). */
  build(): CanvasContent {
    return {
      [DOCUMENT_ID]: { gridSize: 10, name: '', meta: {}, id: DOCUMENT_ID, typeName: 'document' },
      [PAGE_ID]: { meta: {}, id: PAGE_ID, name: 'Page 1', index: 'a1', typeName: 'page' },
      ...this.#records,
    };
  }

  /** Return only the generated records (for merging into an existing canvas). */
  records(): CanvasContent {
    return { ...this.#records };
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
        meta: this.#meta(props.id),
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
        meta: this.#meta(props.id),
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
    // Deterministic per-terminal id so re-rendering an arrow overwrites its own bindings.
    const bindingId = `binding:${arrowId.slice('shape:'.length)}/${terminal}-${++this.#bindingCount}`;
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

  #meta(handle: string | undefined): Record<string, any> {
    return handle && this.#metaFor ? this.#metaFor(handle) : {};
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
