//
// Copyright 2026 DXOS.org
//

//
// Text to scene commands, over the generated Lezer tree. The grammar is deliberately permissive
// about attribute names and values (see `diagram.grammar`); everything the schema actually
// constrains is checked here, so a wrong attribute reports itself with a range the editor can
// underline instead of derailing the parse.
//

import type { SyntaxNode } from '@lezer/common';
import * as Schema from 'effect/Schema';

import { Shape, upgradeStyle } from '@dxos/scene';

import * as GridEngine from '../grid-engine.ts';
import { ITEMS_FIELD, itemRecord } from '../items.ts';
import * as Scene from '../scene.ts';
import * as SemanticEngine from '../semantic-engine.ts';
import * as Semantic from '../semantic.ts';
import * as SequenceEngine from '../sequence-engine.ts';
import { parser } from './gen/diagram.ts';
import {
  type AttrSpec,
  DATA_PREFIX,
  DIAGRAM_ATTRS,
  EDGE_ATTRS,
  ELEMENT_ATTRS,
  ELEMENT_KINDS,
  type ElementKind,
  GRID_RULE_ATTRS,
  GROUP_ATTRS,
  GROUP_FRAME_ATTRS,
  KIND_ATTR,
  LEGACY_BORDER,
  NODE_ATTRS,
  NOTE_ATTRS,
  OBJECT_ATTRS,
  REF_SHAPE,
  dataFieldName,
  withLegacy,
} from './vocabulary.ts';

export type Problem = {
  severity: 'error' | 'warning';
  message: string;
  from: number;
  to: number;
};

export type Range = { from: number; to: number };

export type ParseResult = {
  commands: Scene.Command[];
  problems: Problem[];
  /**
   * Source range of each `objectId` and `objectId/elementId` — the two spellings
   * `Diagnostics.Diagnostic.refs` uses, so a layout report can be shown against the line that
   * produced it rather than at the top of the document.
   */
  ranges: Map<string, Range>;
};

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r' };

export const unquote = (raw: string): string =>
  raw.slice(1, -1).replace(/\\(.)/g, (_match, character: string) => ESCAPES[character] ?? character);

/** Spreads a field only when it is set, so an absent option never becomes an explicit `undefined`. */
export const optional = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } => {
  const result: { [P in K]?: V } = {};
  if (value !== undefined) {
    result[key] = value;
  }
  return result;
};

const isColor = Schema.is(Shape.Color);
const STROKES: readonly Shape.Stroke[] = Shape.Stroke.literals;

/** The kinds that are a line, whose stroke is the whole of what they draw. */
const OPEN_KINDS: ReadonlySet<ElementKind> = new Set(['line', 'curve', 'arc', 'arrow']);

/** Single-kind element nodes; the multi-kind ones carry a `BoxKind`/`PathKind` child instead. */
const SHAPE_KINDS: Record<string, string | undefined> = {
  // A component's box is stored as a rect carrying the component's name; `custom` is how the text says so.
  CustomElement: 'rect',
  GridElement: 'grid',
  CircleElement: 'circle',
  ArcElement: 'arc',
  TextElement: 'text',
  ArrowElement: 'arrow',
  PortalElement: 'portal',
};

/** The closed shapes, the grid included: the kinds a `Shape.Box` covers. */
const BOX_KINDS: ReadonlySet<string> = new Set(Shape.BoxKind.literals);

/** The DSL word for an element, which is also its scene `kind`. */
const kindOf = (shapeName: string, keyword: string | undefined): ElementKind | undefined => {
  const word = keyword ?? SHAPE_KINDS[shapeName];
  return ELEMENT_KINDS.find((kind) => kind === word);
};

export const childrenOf = (node: SyntaxNode): SyntaxNode[] => {
  const children: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    children.push(child);
  }
  return children;
};

/** The message for a semantic id that would replace the connectors object. */
const CONNECTORS_CLASH = `"${Semantic.CONNECTORS}" names the diagram's connectors object; choose another id.`;

/** A document as read, before any semantic statement is laid out. */
export type Reading = ParseResult & {
  /** The semantic statements, when the document has any. */
  diagram?: Semantic.Diagram;
};

/**
 * Reads a document. Syntax errors are reported rather than thrown, and the commands that did parse
 * are returned alongside them, so an editor can keep rendering the last good shapes while a line
 * is half-typed. Semantic statements are collected into a diagram but not laid out.
 */
export const read = (text: string): Reading => {
  const problems: Problem[] = [];
  const commands: Scene.Command[] = [];
  const ranges = new Map<string, Range>();

  const slice = (node: SyntaxNode): string => text.slice(node.from, node.to);

  const report = (node: Range, message: string, severity: Problem['severity'] = 'error'): void => {
    problems.push({ severity, message, from: node.from, to: node.to });
  };

  const readId = (node: SyntaxNode): string => {
    const raw = slice(node);
    return raw.startsWith('"') ? unquote(raw) : raw;
  };

  /**
   * A coordinate the rest of the system can use. The grammar accepts exponent notation because the
   * printer emits it, which also admits `1e309` — `parseFloat` turns that into `Infinity`, and an
   * infinite coordinate poisons layout, renders as nothing, and cannot be printed back at all
   * (`formatNumber` refuses it). Rejecting it here keeps `parse` and `print` accepting the same
   * documents.
   */
  /** A number as the DSL spells it: a decimal, or a quotient (`692/3`) for a value a decimal cannot say exactly. */
  const parseValue = (raw: string): number => {
    const slash = raw.indexOf('/');
    if (slash <= 0) {
      return Number.parseFloat(raw);
    }
    const denominator = Number.parseFloat(raw.slice(slash + 1));
    return denominator === 0 ? Number.NaN : Number.parseFloat(raw.slice(0, slash)) / denominator;
  };

  const readNumber = (node: SyntaxNode): number | undefined => {
    const raw = slice(node);
    const value = parseValue(raw);
    if (!Number.isFinite(value)) {
      report(node, `"${raw}" is not a finite number.`);
      return undefined;
    }
    return value;
  };

  // Error recovery can leave a `Point` or `Range` holding one number instead of two, so every
  // reader returns undefined rather than indexing past the end — `parse` reports problems, and a
  // reader that threw would take the whole document down with the line being typed.
  const readPoint = (node: SyntaxNode): Shape.Point | undefined => {
    const [first, second] = childrenOf(node).filter((child) => child.name === 'Number');
    const [x, y] = [first && readNumber(first), second && readNumber(second)];
    return x !== undefined && y !== undefined ? { x, y } : undefined;
  };

  // `100x50`; `x` appears only as the separator, so a negative extent needs no special case.
  const readSize = (node: SyntaxNode): { w: number; h: number } | undefined => {
    const [width, height] = slice(node).split('x').map(parseValue);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      report(node, `"${slice(node)}" is not a finite size.`);
      return undefined;
    }
    return { w: width, h: height };
  };

  const readRange = (node: SyntaxNode): { startAngle: number; endAngle: number } | undefined => {
    const [first, second] = childrenOf(node).filter((child) => child.name === 'Number');
    const [startAngle, endAngle] = [first && readNumber(first), second && readNumber(second)];
    return startAngle !== undefined && endAngle !== undefined ? { startAngle, endAngle } : undefined;
  };

  //
  // Attributes. Each reader narrows by searching the schema's own literals, so a value that is
  // not one of them comes back `undefined` with a problem attached rather than a widened type.
  //

  type Attr = { node: SyntaxNode; valueNode: SyntaxNode };

  const readAttrs = (nodes: SyntaxNode[], allowed: readonly AttrSpec[], subject: string): Map<string, Attr> => {
    const attrs = new Map<string, Attr>();
    for (const node of nodes) {
      const name = node.getChild('AttrName');
      const valueNode = node.getChild('AttrValue');
      if (!name || !valueNode) {
        continue;
      }
      const key = slice(name);
      if (!allowed.some((spec) => spec.name === key)) {
        report(node, `Unknown attribute "${key}" on ${subject}.`);
        continue;
      }
      if (attrs.has(key)) {
        report(node, `Duplicate attribute "${key}" on ${subject}.`);
      }
      attrs.set(key, { node, valueNode });
    }
    return attrs;
  };

  const numberAttr = (attrs: Map<string, Attr>, name: string): number | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const value = Number.parseFloat(slice(attr.valueNode));
    if (!Number.isFinite(value)) {
      report(attr.node, `"${name}" takes a finite number.`);
      return undefined;
    }
    return value;
  };

  const stringAttr = (attrs: Map<string, Attr>, name: string): string | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    if (!raw.startsWith('"')) {
      report(attr.node, `"${name}" takes a quoted string.`);
      return undefined;
    }
    return unquote(raw);
  };

  const booleanAttr = (attrs: Map<string, Attr>, name: string): boolean | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    if (raw !== 'true' && raw !== 'false') {
      report(attr.node, `"${name}" takes true or false.`);
      return undefined;
    }
    return raw === 'true';
  };

  const enumAttr = <T extends string>(attrs: Map<string, Attr>, name: string, values: readonly T[]): T | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    const match = values.find((value) => value === raw);
    if (match === undefined) {
      report(attr.node, `"${name}" takes one of: ${values.join(', ')}.`);
    }
    return match;
  };

  /** A colour, which the scene's own schema checks since the set is open; a CSS literal is quoted, as `#` opens a comment. */
  const colorAttr = (attrs: Map<string, Attr>, name: string): Shape.Color | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    const value = raw.startsWith('"') ? unquote(raw) : raw;
    if (!isColor(value)) {
      report(attr.node, `"${name}" takes a colour: a name (blue), a name at a tone (blue/2), or a quoted CSS colour.`);
      return undefined;
    }
    return value;
  };

  /**
   * The stroke a statement states. On a closed shape, older text's `border` flag still says whether the outline is
   * drawn, and means what the scene's reader of old styles says it does; on a line it never said anything.
   */
  const strokeAttr = (attrs: Map<string, Attr>, closed = true): Shape.Stroke | undefined => {
    const stroke = enumAttr(attrs, 'stroke', STROKES);
    const border = booleanAttr(attrs, LEGACY_BORDER.name);
    if (border === undefined || !closed) {
      return stroke;
    }
    const stated = upgradeStyle({ ...optional('stroke', stroke), border })?.stroke;
    return STROKES.find((candidate) => candidate === stated);
  };

  /** A bare word from an open set a plugin extends, so there are no literals to check it against. */
  const nameAttr = (attrs: Map<string, Attr>, name: string): string | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    return raw.startsWith('"') ? unquote(raw) : raw;
  };

  /**
   * A contributed kind's own field, whose type the plugin decides: read as the number or boolean it spells, and a
   * string otherwise. Lists and nested objects have no spelling in the DSL at all, so a kind's field holding one
   * cannot be written down; `read` drops it and this never sees it.
   */
  const scalarAttr = (attrs: Map<string, Attr>, name: string): string | number | boolean | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    if (raw.startsWith('"')) {
      return unquote(raw);
    }
    if (raw === 'true' || raw === 'false') {
      return raw === 'true';
    }
    // A number through the grammar's own reader, which spells a fraction (`1/2`) that `Number()` gives back as
    // NaN — storing the raw text instead, and turning a numeric field into a string on the way round.
    const number = attr.valueNode.getChild('Number');
    if (number) {
      const value = readNumber(number);
      if (value !== undefined) {
        return value;
      }
    }
    return raw;
  };

  /** A grid's track list: a count, or the spelling `"1fr auto 2fr"`. A boolean is neither, so it is not one. */
  const tracksAttr = (attrs: Map<string, Attr>, name: string): number | string | undefined => {
    const value = scalarAttr(attrs, name);
    return typeof value === 'boolean' ? undefined : value;
  };

  /**
   * The attributes a component's own fields add to a statement naming one (`kind=card`). No table can list them —
   * the plugin that defines the component decides them — so they are admitted here and ride on `data`, which is
   * what lets a drawing that uses a component be written down instead of flattening to a plain box. An escaped
   * name is the component's field whatever the table says: that is what the prefix is for.
   */
  const ownAttrs = (nodes: SyntaxNode[], allowed: readonly AttrSpec[]): AttrSpec[] => {
    const names = nodes.flatMap((node) => {
      const attrName = node.getChild('AttrName');
      return attrName ? [slice(attrName)] : [];
    });
    if (!allowed.some((spec) => spec.name === KIND_ATTR) || !names.includes(KIND_ATTR)) {
      return [];
    }
    return names
      .filter((name) => name.startsWith(DATA_PREFIX) || !allowed.some((spec) => spec.name === name))
      .map((name) => ({ name, type: 'scalar' as const }));
  };

  /** A component's own fields, under the names the component gives them. */
  const readData = (attrs: Map<string, Attr>, own: readonly AttrSpec[]): Record<string, Semantic.Scalar> =>
    Object.fromEntries(
      own.flatMap((spec) => {
        const value = scalarAttr(attrs, spec.name);
        return value === undefined ? [] : [[dataFieldName(spec.name), value] as const];
      }),
    );

  /**
   * The rows a statement's braces list (`{ item "…" icon=x }`), each with its text and its own fields; every
   * attribute of a row is the row's, since a row has none the language defines.
   */
  const readItems = (owner: SyntaxNode): Semantic.Item[] => {
    const body = owner.getChild('ItemBody');
    return childrenOf(body ?? owner)
      .filter((child) => body !== null && child.name === 'ItemDecl')
      .flatMap((decl) => {
        const label = decl.getChild('Label');
        if (!label) {
          return [];
        }
        const nodes = childrenOf(decl).filter((child) => child.name === 'Attribute');
        const specs = nodes.flatMap((node) => {
          const name = node.getChild('AttrName');
          return name ? [{ name: slice(name), type: 'scalar' as const }] : [];
        });
        const fields = readData(readAttrs(nodes, specs, 'item'), specs);
        return [{ text: unquote(slice(label)), ...(Object.keys(fields).length ? { data: fields } : {}) }];
      });
  };

  /** The style fields every element shares; `closed` says the element has an outline rather than being a line. */
  const readStyle = (attrs: Map<string, Attr>, closed: boolean) => ({
    ...optional('color', colorAttr(attrs, 'color')),
    ...optional('fill', enumAttr(attrs, 'fill', Shape.Fill.literals)),
    ...optional('stroke', strokeAttr(attrs, closed)),
    ...optional('weight', enumAttr(attrs, 'weight', Shape.Weight.literals)),
    ...optional('align', enumAttr(attrs, 'align', Shape.Align.literals)),
    ...optional('valign', enumAttr(attrs, 'valign', Shape.VerticalAlign.literals)),
    ...optional('fontSize', numberAttr(attrs, 'fontSize')),
  });

  const readEndpoint = (node: SyntaxNode): { ref?: string; point?: Shape.Point } => {
    const child = node.firstChild;
    if (!child) {
      return {};
    }
    switch (child.name) {
      case 'Point':
        return { point: readPoint(child) };
      case 'Ref': {
        const raw = slice(child);
        // An id the grammar cannot lex bare is written quoted, so the printer can round-trip a ref
        // like `1st/box` that a dialect produced from a numeric node id.
        const ref = raw.startsWith('"') ? unquote(raw) : raw;
        if (!REF_SHAPE.test(ref)) {
          report(child, `"${ref}" is not a ref; write element, object/element, or either with #port.`);
        }
        return { ref };
      }
      default:
        return {};
    }
  };

  /** Point list with the incomplete ones dropped; the syntax error is already reported. */
  const readPoints = (nodes: SyntaxNode[]): Shape.Point[] =>
    nodes.flatMap((node) => {
      const point = readPoint(node);
      return point ? [point] : [];
    });

  const readElement = (node: SyntaxNode): Shape.Element | undefined => {
    const shape = node.firstChild;
    if (!shape) {
      return undefined;
    }
    const parts = childrenOf(shape);
    const idNode = parts.find((part) => part.name === 'Id');
    if (!idNode) {
      return undefined;
    }
    const id = readId(idNode);
    const points = parts.filter((part) => part.name === 'Point');
    const label = parts.find((part) => part.name === 'Label');
    const text = label ? unquote(slice(label)) : undefined;

    const kindNode = parts.find((part) => part.name === 'BoxKind' || part.name === 'PathKind');
    const kind = kindOf(shape.name, kindNode ? slice(kindNode) : undefined);
    if (kind === undefined) {
      return undefined;
    }

    const attributeNodes = parts.filter((part) => part.name === 'Attribute');
    const allowed = withLegacy(ELEMENT_ATTRS[kind]);
    const extra = ownAttrs(attributeNodes, allowed);
    const attrs = readAttrs(attributeNodes, [...allowed, ...extra], `${kind} "${id}"`);
    const items = readItems(shape);
    // A component's rows ride in its own bag, beside its fields, as the list they are.
    const data: Record<string, unknown> = {
      ...readData(attrs, extra),
      ...(items.length > 0 ? { [ITEMS_FIELD]: items.map(itemRecord) } : {}),
    };
    const style = readStyle(attrs, !OPEN_KINDS.has(kind));
    // One spelling for a box a component draws: the shape words draw shapes, and `custom` names a component.
    const custom = shape.name === 'CustomElement';
    const component = nameAttr(attrs, KIND_ATTR);
    if (custom && component === undefined) {
      report(shape, `\`custom\` is drawn by a component; say which with \`${KIND_ATTR}=<name>\`.`);
    } else if (!custom && component !== undefined && BOX_KINDS.has(kind)) {
      report(shape, `A box a component draws is written \`custom ${id} ${KIND_ATTR}=${component}\`, not \`${kind}\`.`);
    }

    switch (kind) {
      case 'rect':
      case 'ellipse':
      case 'diamond':
      case 'triangle':
      case 'grid': {
        const sizeNode = parts.find((part) => part.name === 'Size');
        // Both are optional: inside a grid the origin and the size are the grid's to decide, and a size of zero is
        // how a track is told to share what is left.
        const origin = (points[0] && readPoint(points[0])) ?? { x: 0, y: 0 };
        const size = (sizeNode && readSize(sizeNode)) ?? { w: 0, h: 0 };
        return {
          kind,
          id,
          x: origin.x,
          y: origin.y,
          ...size,
          ...optional('rotation', numberAttr(attrs, 'rotation')),
          ...optional('text', text),
          ...optional('corners', enumAttr(attrs, 'corners', Shape.Corners.literals)),
          ...optional('cols', tracksAttr(attrs, 'cols')),
          ...optional('rows', tracksAttr(attrs, 'rows')),
          ...optional('gap', numberAttr(attrs, 'gap')),
          ...optional('padding', numberAttr(attrs, 'padding')),
          ...optional('layout', enumAttr(attrs, 'layout', Shape.Layout.literals)),
          ...optional('packSeed', numberAttr(attrs, 'packSeed')),
          ...optional('packMin', numberAttr(attrs, 'packMin')),
          ...optional('packMax', numberAttr(attrs, 'packMax')),
          ...optional('autoCols', tracksAttr(attrs, 'autoCols')),
          ...optional('autoRows', tracksAttr(attrs, 'autoRows')),
          ...optional('justifyContent', enumAttr(attrs, 'justifyContent', Shape.Place.literals)),
          ...optional('alignContent', enumAttr(attrs, 'alignContent', Shape.Place.literals)),
          ...optional('parent', nameAttr(attrs, 'parent')),
          ...optional('width', numberAttr(attrs, 'width')),
          ...optional('height', numberAttr(attrs, 'height')),
          ...optional('component', nameAttr(attrs, KIND_ATTR)),
          ...(Object.keys(data).length ? { data } : {}),
          ...style,
        };
      }

      case 'circle': {
        const radiusNode = parts.find((part) => part.name === 'Number');
        const centre = points[0] && readPoint(points[0]);
        const radius = radiusNode && readNumber(radiusNode);
        if (radius === undefined || !centre) {
          return undefined;
        }
        return {
          kind,
          id,
          cx: centre.x,
          cy: centre.y,
          r: radius,
          ...optional('text', text),
          ...style,
        };
      }

      case 'line':
        return {
          kind,
          id,
          points: readPoints(points),
          ...optional('closed', booleanAttr(attrs, 'closed')),
          ...optional('guide', booleanAttr(attrs, 'guide')),
          ...style,
        };

      case 'curve':
        return { kind, id, points: readPoints(points), ...style };

      case 'arc': {
        const radiusNode = parts.find((part) => part.name === 'Number');
        const rangeNode = parts.find((part) => part.name === 'Range');
        const centre = points[0] && readPoint(points[0]);
        const radius = radiusNode && readNumber(radiusNode);
        const range = rangeNode && readRange(rangeNode);
        if (radius === undefined || !centre || !range) {
          return undefined;
        }
        return { kind, id, cx: centre.x, cy: centre.y, r: radius, ...range, ...style };
      }

      case 'text': {
        const at = points[0] && readPoint(points[0]);
        if (!at || text === undefined) {
          return undefined;
        }
        return { kind, id, x: at.x, y: at.y, text, ...optional('w', numberAttr(attrs, 'w')), ...style };
      }

      case 'arrow': {
        const connection = parts.find((part) => part.name === 'Connection');
        const ends = connection ? childrenOf(connection).filter((child) => child.name === 'Endpoint') : [];
        const [from, to] = ends.map(readEndpoint);
        const route = parts.filter((part) => part.name === 'Via').flatMap(readRoute);
        return {
          kind,
          id,
          ...optional('from', from?.ref),
          ...optional('to', to?.ref),
          ...optional('start', from?.point),
          ...optional('end', to?.point),
          ...optional('text', text),
          ...(route.length ? { route } : {}),
          ...optional('head', enumAttr(attrs, 'head', Shape.ArrowHead.literals)),
          ...optional('tail', enumAttr(attrs, 'tail', Shape.ArrowTail.literals)),
          ...optional('path', enumAttr(attrs, 'path', Shape.Path.literals)),
          ...optional('relation', enumAttr(attrs, 'relation', Shape.Relation.literals)),
          ...style,
        };
      }

      case 'portal': {
        const sizeNode = parts.find((part) => part.name === 'Size');
        const origin = points[0] && readPoint(points[0]);
        const size = sizeNode && readSize(sizeNode);
        if (!origin || !size) {
          return undefined;
        }
        const ref = stringAttr(attrs, 'ref');
        if (ref === undefined) {
          report(shape, `portal "${id}" needs ref="<dxn>": it is the drawing shown inside the frame.`);
          return undefined;
        }
        return { kind, id, x: origin.x, y: origin.y, ...size, ref, ...optional('text', text), ...style };
      }
    }
  };

  /**
   * The elements of a body, flattened. A grid's children are written inside its braces and come out beside it with
   * a `parent` naming it: the text is a tree because that is how a reader holds a layout, and the model is flat
   * because that is how records merge and undo. Nesting is therefore the spelling of `parent`, not a second shape.
   */
  /** Where each element was written, so a check made after the whole body is read can still point at it. */
  const declaredAt = new Map<string, SyntaxNode>();

  const readElements = (body: SyntaxNode | null, objectId: string, top = true): Shape.Element[] => {
    if (!body) {
      return [];
    }
    const elements = childrenOf(body)
      .filter((child) => child.name === 'Element')
      .flatMap((child) => {
        const element = readElement(child);
        if (!element) {
          return [];
        }
        ranges.set(`${objectId}/${element.id}`, { from: child.from, to: child.to });
        declaredAt.set(element.id, child);
        const nested = child.firstChild?.getChild('GridBody');
        if (!nested) {
          return [element];
        }
        return [
          element,
          ...readElements(nested, objectId, false).map((inner) =>
            // An explicit `parent` is left alone: it is the same statement said the other way, and a child that
            // names one container while sitting inside another is a contradiction the reader should not resolve.
            'parent' in inner && inner.parent !== undefined ? inner : { ...inner, parent: element.id },
          ),
        ];
      });

    // A box with no extent draws nothing, and only a grid can give it one. Checked once the whole body is read,
    // because the grid that places a child is the braces around it, which are not known while the child is.
    if (top) {
      for (const element of elements) {
        const sizeless =
          (element.kind === 'rect' || element.kind === 'ellipse' || element.kind === 'diamond') &&
          (element.w === 0 || element.h === 0) &&
          element.parent === undefined;
        const at = declaredAt.get(element.id);
        if (sizeless && at) {
          report(at, `"${element.id}" has no size, and no grid to give it one.`);
        }
      }
    }
    return elements;
  };

  //
  // Semantic statements, collected into one diagram and checked once every statement is read, since
  // an edge may name a node declared further down.
  //

  const diagram = Semantic.empty();
  let semantic = false;
  const rangeOf = (node: SyntaxNode): Range => ({ from: node.from, to: node.to });

  /** What only a grid diagram reads, reported once the kind is known: `diagram` may come after what it governs. */
  const gridOnly: { range: Range; what: string }[] = [];
  /** Groups written inside another, which only a grid diagram keeps. */
  const nested: { node: SyntaxNode; id: string; outer: string }[] = [];
  const members = new Map<string, string[]>();
  diagram.members = members;
  const enlist = (owner: string | undefined, id: string): void => {
    const key = owner ?? Semantic.ROOT;
    members.set(key, [...(members.get(key) ?? []), id]);
  };
  const gridAttrs = (attrs: Map<string, Attr>, names: readonly string[]): void =>
    names.forEach((name) => {
      const attr = attrs.get(name);
      attr && gridOnly.push({ range: rangeOf(attr.node), what: `"${name}"` });
    });
  /** The rule a container places its members by, less `gap`, which a group of any kind also states. */
  const readRule = (attrs: Map<string, Attr>): Omit<Semantic.GridRule, 'gap'> => ({
    ...optional('cols', tracksAttr(attrs, 'cols')),
    ...optional('rows', tracksAttr(attrs, 'rows')),
    ...optional('padding', numberAttr(attrs, 'padding')),
    ...optional('autoCols', tracksAttr(attrs, 'autoCols')),
    ...optional('autoRows', tracksAttr(attrs, 'autoRows')),
    ...optional('justifyContent', enumAttr(attrs, 'justifyContent', Shape.Place.literals)),
    ...optional('alignContent', enumAttr(attrs, 'alignContent', Shape.Place.literals)),
    ...optional('layout', enumAttr(attrs, 'layout', Shape.Layout.literals)),
    ...optional('packSeed', numberAttr(attrs, 'packSeed')),
    ...optional('packMin', numberAttr(attrs, 'packMin')),
    ...optional('packMax', numberAttr(attrs, 'packMax')),
  });

  const sizeAttr = (attrs: Map<string, Attr>, name: string): Semantic.Size | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    const [width, height] = raw.split('x').map(parseValue);
    if (!/^[^x]+x[^x]+$/.test(raw) || !(width > 0) || !(height > 0)) {
      report(attr.node, `"${name}" takes a size like 384x224.`);
      return undefined;
    }
    return { w: width, h: height };
  };

  /** `W:H` as the ratio W/H. */
  const ratioAttr = (attrs: Map<string, Attr>, name: string): number | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const [width, height] = slice(attr.valueNode).split(':').map(Number.parseFloat);
    if (attr.valueNode.getChild('Ratio') === null || !(width > 0) || !(height > 0)) {
      report(attr.node, `"${name}" takes a ratio like 4:3.`);
      return undefined;
    }
    return width / height;
  };

  const attributesOf = (statement: SyntaxNode) => childrenOf(statement).filter((child) => child.name === 'Attribute');

  const readRelations = (statement: SyntaxNode): Semantic.Relation[] =>
    childrenOf(statement)
      .filter((child) => child.name === 'Relation')
      .flatMap((relation) => {
        const kindNode = relation.getChild('RelationKind');
        const target = relation.getChild('Id');
        if (!kindNode || !target) {
          return [];
        }
        const word = slice(kindNode);
        const kind = Semantic.RELATION_KINDS.find((candidate) => candidate === word);
        if (!kind) {
          report(kindNode, `Unknown relation "${word}"; use one of: ${Semantic.RELATION_KINDS.join(', ')}.`);
          return [];
        }
        return [{ kind, target: readId(target), soft: relation.getChild('Soft') !== null, range: rangeOf(relation) }];
      });

  /** `cell(c,r)` coordinates; `_` leaves one open where the caller allows it. */
  const readCoords = (node: SyntaxNode): (number | undefined)[] =>
    childrenOf(node)
      .filter((child) => child.name === 'Coord')
      .map((coord) => {
        const number = coord.getChild('Number');
        return number ? readNumber(number) : undefined;
      });

  const readPin = (statement: SyntaxNode): Semantic.Pin | undefined => {
    const pin = statement.getChild('Pin');
    if (!pin) {
      return undefined;
    }
    const point = pin.getChild('Point');
    if (point) {
      const at = readPoint(point);
      return at ? { kind: 'point', ...at, range: rangeOf(pin) } : undefined;
    }
    const cell = pin.getChild('CellRef');
    if (!cell) {
      return undefined;
    }
    const [col, row] = readCoords(cell);
    if (col === undefined || row === undefined || !Number.isInteger(col) || !Number.isInteger(row)) {
      report(cell, 'A pin names a whole cell: @cell(<column>,<row>) with two integers.');
      return undefined;
    }
    return { kind: 'cell', col, row, range: rangeOf(pin) };
  };

  const readNode = (statement: SyntaxNode, group: string | undefined): void => {
    const idNode = statement.getChild('Id');
    if (!idNode) {
      return;
    }
    const id = readId(idNode);
    const label = statement.getChild('Label');
    const attributeNodes = attributesOf(statement);
    const allowed = withLegacy(NODE_ATTRS);
    const own = ownAttrs(attributeNodes, allowed);
    const attrs = readAttrs(attributeNodes, [...allowed, ...own], `node "${id}"`);
    const pins = childrenOf(statement).filter((child) => child.name === 'Pin');
    if (pins.length > 1) {
      report(pins[1], `node "${id}" has more than one pin.`);
    }
    if (id === Semantic.CONNECTORS) {
      report(idNode, CONNECTORS_CLASH);
      return;
    }
    if (diagram.nodes.some((node) => node.id === id) || diagram.groups.some((entry) => entry.id === id)) {
      report(idNode, `"${id}" is already declared.`);
      return;
    }
    const pin = readPin(statement);
    const relations = readRelations(statement);
    diagram.hinted ||= pin !== undefined || relations.length > 0;
    const data = readData(attrs, own);
    gridAttrs(attrs, [KIND_ATTR, LEGACY_BORDER.name, 'width', 'height']);
    const items = readItems(statement);
    const body = statement.getChild('ItemBody');
    if (body) {
      gridOnly.push({ range: rangeOf(body), what: 'A row (`item`)' });
      // A plain box has nothing that draws a row; a component does.
      if (items.length > 0 && !attrs.has(KIND_ATTR)) {
        report(body, `Rows are drawn by a component; add \`${KIND_ATTR}=<name>\` to node "${id}".`);
      }
    }
    // A component draws itself, so the shape of the box under it is not seen and has no spelling in the box form.
    if (attrs.has(KIND_ATTR) && attrs.has('shape')) {
      report(statement, `"shape" says nothing on a node a component draws; drop it or \`${KIND_ATTR}\`.`);
    }
    enlist(group, id);
    diagram.nodes.push({
      id,
      label: label ? unquote(slice(label)) : id,
      relations,
      range: rangeOf(statement),
      ...(label ? { labelled: true } : {}),
      ...optional('component', nameAttr(attrs, KIND_ATTR)),
      ...(Object.keys(data).length ? { data } : {}),
      ...(items.length > 0 ? { items } : {}),
      ...optional('group', group),
      ...optional('pin', pin),
      ...optional('ref', stringAttr(attrs, 'ref')),
      ...optional('role', enumAttr(attrs, 'role', Semantic.ROLES)),
      ...optional('shape', enumAttr(attrs, 'shape', Shape.BoxKind.literals)),
      ...optional('color', colorAttr(attrs, 'color')),
      ...optional('fill', enumAttr(attrs, 'fill', Shape.Fill.literals)),
      ...optional('stroke', strokeAttr(attrs)),
      ...optional('width', numberAttr(attrs, 'width')),
      ...optional('height', numberAttr(attrs, 'height')),
    });
    ranges.set(id, rangeOf(statement));
  };

  const readEnd = (node: SyntaxNode): Semantic.End | undefined => {
    const idNode = node.getChild('Id');
    if (!idNode) {
      return undefined;
    }
    const sideList = node.getChild('SideList');
    const sides = sideList
      ? childrenOf(sideList)
          .filter((child) => child.name === 'Side')
          .flatMap((child) => {
            const word = slice(child);
            const side = Semantic.SIDES.find((candidate) => candidate === word);
            if (!side) {
              report(child, `Unknown side "${word}"; use top, bottom, left or right.`);
            }
            return side ? [side] : [];
          })
      : undefined;
    const soft = sides?.length && node.getChild('Soft') !== null ? true : undefined;
    return {
      node: readId(idNode),
      range: rangeOf(node),
      ...optional('sides', sides?.length ? sides : undefined),
      ...optional('soft', soft),
    };
  };

  /**
   * An arrow's own bends: plain points, both coordinates given. A semantic edge's waypoints may pin one coordinate
   * or name a grid cell, because an engine routes them; an arrow states where its route actually runs, so neither
   * has a meaning here.
   */
  const readRoute = (via: SyntaxNode): Shape.Point[] =>
    childrenOf(via)
      .filter((child) => child.name === 'Waypoint')
      .flatMap((waypoint): Shape.Point[] => {
        if (waypoint.getChild('CellRef')) {
          report(waypoint, 'An arrow routes through points, not grid cells.');
          return [];
        }
        const [x, y] = readCoords(waypoint);
        if (x === undefined || y === undefined) {
          report(waypoint, 'A bend of an arrow needs both coordinates.');
          return [];
        }
        return [{ x, y }];
      });

  const readWaypoints = (via: SyntaxNode): Semantic.Waypoint[] =>
    childrenOf(via)
      .filter((child) => child.name === 'Waypoint')
      .flatMap((waypoint): Semantic.Waypoint[] => {
        const cell = waypoint.getChild('CellRef');
        const [x, y] = readCoords(cell ?? waypoint);
        if (x === undefined && y === undefined) {
          report(waypoint, 'A waypoint needs at least one coordinate; write `_` only for the one left free.');
          return [];
        }
        return [{ unit: cell ? 'cell' : 'scene', range: rangeOf(waypoint), ...optional('x', x), ...optional('y', y) }];
      });

  /** Unnamed buses are per statement; named ones join across statements. */
  let statementIndex = 0;
  const pendingBuses: { edges: Semantic.Edge[]; name: string; node: SyntaxNode; label?: string; named: boolean }[] = [];

  /** Where the messages, notes and fragments being read go; a fragment section swaps in its own. */
  let steps: Semantic.Step[] = diagram.timeline;
  /** Ranges of statements only a sequence diagram reads, checked once the kind is known. */
  const sequenceOnly: { range: Range; what: string }[] = [];

  const readEdge = (statement: SyntaxNode): void => {
    statementIndex++;
    const lists = childrenOf(statement).filter((child) => child.name === 'EndList');
    if (lists.length < 2) {
      return;
    }
    const [sources, targets] = lists.map((list) =>
      childrenOf(list)
        .filter((child) => child.name === 'EdgeEnd')
        .flatMap((end) => readEnd(end) ?? []),
    );
    const opNode = statement.getChild('EdgeOp');
    const op = opNode ? slice(opNode) : '->';
    const word = opNode?.getChild('RelationWord');
    const relation = word && Object.hasOwn(Semantic.RELATIONSHIPS, op) ? Semantic.RELATIONSHIPS[op] : undefined;
    const message = word && Object.hasOwn(Semantic.MESSAGES, op) ? Semantic.MESSAGES[op] : undefined;
    if (word && !relation && !message) {
      report(
        word,
        `Unknown relationship "${op}"; use ->, <->, -- or one of: ${[...Object.keys(Semantic.RELATIONSHIPS), ...Object.keys(Semantic.MESSAGES)].join(', ')}.`,
      );
    }
    if (word && message) {
      sequenceOnly.push({ range: rangeOf(word), what: `"${op}"` });
    }
    const label = statement.getChild('Label');
    const text = label ? unquote(slice(label)) : undefined;
    const attrs = readAttrs(attributesOf(statement), EDGE_ATTRS, 'edge');
    const via = childrenOf(statement)
      .filter((child) => child.name === 'Via')
      .flatMap(readWaypoints);
    const busNode = statement.getChild('Bus');
    const busName = busNode?.getChild('Id');
    const style: Semantic.EdgeStyle = {
      ...optional('relation', relation),
      ...optional('head', op === '--' ? 'none' : enumAttr(attrs, 'head', Shape.ArrowHead.literals)),
      ...optional('tail', enumAttr(attrs, 'tail', Shape.ArrowTail.literals)),
      ...optional('path', enumAttr(attrs, 'path', Shape.Path.literals)),
      ...optional('stroke', enumAttr(attrs, 'stroke', STROKES)),
      ...optional('color', colorAttr(attrs, 'color')),
    };
    gridAttrs(attrs, ['path']);
    const fan = sources.length > 1 || targets.length > 1;
    if (busNode && sources.length > 1 && targets.length > 1) {
      report(busNode, 'A bus joins one node to several: write `edge A -> B, C bus` or `edge B, C -> A bus`.');
    }
    const busTrunk = busNode !== null && fan && !(sources.length > 1 && targets.length > 1);
    const pairs = sources.flatMap((from) => targets.map((to) => ({ from, to })));
    const made: Semantic.Edge[] = [];
    for (const { from, to } of pairs) {
      const directions =
        op === '<->'
          ? [
              { from, to },
              { from: to, to: from },
            ]
          : [{ from, to }];
      directions.forEach((direction, position) => {
        const edge: Semantic.Edge = {
          id: `${direction.from.node}-${direction.to.node}-${diagram.edges.length}`,
          from: direction.from,
          to: direction.to,
          via: position === 0 ? via : [...via].reverse(),
          range: rangeOf(statement),
          ...style,
          ...optional('message', message),
          // A trunk carries the statement's label; the reverse of a two-way edge repeats nothing.
          ...optional('label', busTrunk || position > 0 ? undefined : text),
        };
        diagram.edges.push(edge);
        steps.push({ kind: 'message', edge: edge.id });
        made.push(edge);
        ranges.set(`edges/${edge.id}`, rangeOf(statement));
        ranges.set(`edges/${edge.id}-path`, rangeOf(statement));
      });
    }
    diagram.hinted ||=
      via.length > 0 ||
      busNode !== null ||
      sources.some((end) => end.sides !== undefined) ||
      targets.some((end) => end.sides !== undefined);
    if (busNode && !(sources.length > 1 && targets.length > 1)) {
      pendingBuses.push({
        edges: made,
        name: busName ? readId(busName) : `#${statementIndex}`,
        node: busNode,
        named: busName !== null,
        ...optional('label', busTrunk ? text : undefined),
      });
    }
  };

  let noteIndex = 0;
  const readNote = (statement: SyntaxNode): void => {
    const list = statement.getChild('EndList');
    const label = statement.getChild('Label');
    if (!list || !label) {
      return;
    }
    sequenceOnly.push({ range: rangeOf(statement), what: 'A note' });
    const ends = childrenOf(list)
      .filter((child) => child.name === 'EdgeEnd')
      .flatMap((end) => readEnd(end) ?? []);
    const sides = ends.flatMap((end) => end.sides ?? []);
    const side = sides[0];
    if (sides.length > 1 || (side !== undefined && side !== 'left' && side !== 'right')) {
      report(
        list,
        'A note sits beside one participant (`note A:left` or `note A:right`) or over several (`note A, B`).',
      );
    } else if (side !== undefined && ends.length > 1) {
      report(list, 'A note over several participants takes no side.');
    }
    const attrs = readAttrs(attributesOf(statement), NOTE_ATTRS, 'note');
    steps.push({
      kind: 'note',
      note: {
        id: `note-${noteIndex++}`,
        over: ends.map((end) => end.node),
        side: ends.length > 1 ? 'over' : side === 'left' ? 'left' : 'right',
        text: unquote(slice(label)),
        range: rangeOf(statement),
        ...optional('color', colorAttr(attrs, 'color')),
      },
    });
  };

  let fragmentIndex = 0;
  const readFragment = (statement: SyntaxNode): void => {
    const kindNode = statement.getChild('FragmentKind');
    if (!kindNode) {
      return;
    }
    sequenceOnly.push({ range: rangeOf(statement), what: 'A fragment' });
    const word = slice(kindNode);
    const kind = Semantic.FRAGMENT_KINDS.find((candidate) => candidate === word);
    if (!kind) {
      report(kindNode, `Unknown fragment "${word}"; use one of: ${Semantic.FRAGMENT_KINDS.join(', ')}.`);
    }
    // Children alternate: [Label] FragmentBody, then Else [Label] FragmentBody per further section.
    const sections: Semantic.Section[] = [];
    let guard: string | undefined;
    let elseNode: SyntaxNode | undefined;
    for (const child of childrenOf(statement)) {
      if (child.name === 'Label') {
        guard = unquote(slice(child));
      } else if (child.name === 'Else') {
        elseNode = child;
      } else if (child.name === 'FragmentBody') {
        const outer = steps;
        const section: Semantic.Section = { steps: [], range: rangeOf(child), ...optional('guard', guard) };
        steps = section.steps;
        for (const entry of childrenOf(child)) {
          readStep(entry);
        }
        steps = outer;
        sections.push(section);
        guard = undefined;
      }
    }
    if (elseNode && kind !== 'alt' && kind !== 'par') {
      report(elseNode, `Only alt and par take \`else\`; a ${word} fragment has one section.`);
    }
    if (kind) {
      steps.push({
        kind: 'fragment',
        fragment: { id: `fragment-${fragmentIndex++}`, kind, sections, range: rangeOf(statement) },
      });
    }
  };

  const readStep = (statement: SyntaxNode): void => {
    if (statement.name === 'EdgeDecl') {
      readEdge(statement);
    } else if (statement.name === 'NoteDecl') {
      readNote(statement);
    } else if (statement.name === 'FragmentDecl') {
      readFragment(statement);
    }
  };

  const readGroup = (statement: SyntaxNode, outer: string | undefined): void => {
    const idNode = statement.getChild('Id');
    if (!idNode) {
      return;
    }
    const id = readId(idNode);
    let declared = false;
    if (id === Semantic.CONNECTORS) {
      report(idNode, CONNECTORS_CLASH);
    } else if (diagram.groups.some((group) => group.id === id) || diagram.nodes.some((node) => node.id === id)) {
      report(idNode, `"${id}" is already declared.`);
    } else {
      declared = true;
      const label = statement.getChild('Label');
      const attrs = readAttrs(attributesOf(statement), withLegacy(GROUP_ATTRS), `group "${id}"`);
      const relations = readRelations(statement);
      const gap = numberAttr(attrs, 'gap');
      const width = numberAttr(attrs, 'max-width');
      const maxWidth = width !== undefined && Number.isInteger(width) && width >= 1 ? width : undefined;
      if (width !== undefined && maxWidth === undefined) {
        report(attrs.get('max-width')?.node ?? statement, '"max-width" takes a whole number of columns, at least 1.');
      }
      const compact = statement.getChild('Compact') !== null ? true : undefined;
      if (outer === undefined) {
        diagram.hinted ||= relations.length > 0 || gap !== undefined || maxWidth !== undefined || compact === true;
      } else {
        nested.push({ node: idNode, id, outer });
      }
      gridAttrs(attrs, [...GRID_RULE_ATTRS, ...GROUP_FRAME_ATTRS, LEGACY_BORDER.name]);
      enlist(outer, id);
      diagram.groups.push({
        id,
        label: label ? unquote(slice(label)) : id,
        relations,
        range: rangeOf(statement),
        ...optional('heading', label ? unquote(slice(label)) : undefined),
        ...optional('parent', outer),
        ...readRule(attrs),
        ...optional('fill', enumAttr(attrs, 'fill', Shape.Fill.literals)),
        ...optional('stroke', strokeAttr(attrs)),
        ...optional('gap', gap),
        ...optional('maxWidth', maxWidth),
        ...optional('compact', compact),
        ...optional('color', colorAttr(attrs, 'color')),
      });
      ranges.set(id, rangeOf(statement));
    }
    const owner = declared ? id : (outer ?? id);
    for (const child of childrenOf(statement.getChild('GroupBody') ?? statement)) {
      if (child.name === 'NodeDecl') {
        readNode(child, owner);
      } else if (child.name === 'EdgeDecl') {
        readEdge(child);
      } else if (child.name === 'GroupDecl') {
        readGroup(child, owner);
      }
    }
  };

  const readDiagram = (statement: SyntaxNode): void => {
    const attrs = readAttrs(attributesOf(statement), DIAGRAM_ATTRS, 'diagram');
    const point = statement.getChild('Origin')?.getChild('Point');
    const origin = point && readPoint(point);
    const flow = enumAttr(attrs, 'flow', Semantic.FLOWS);
    const kind = enumAttr(attrs, 'kind', Semantic.DIAGRAM_KINDS);
    if (kind) {
      diagram.kind = kind;
    }
    const grid = sizeAttr(attrs, 'grid');
    const box = sizeAttr(attrs, 'box');
    const aspect = ratioAttr(attrs, 'aspect');
    if (aspect) {
      diagram.aspect = aspect;
    }
    const size = sizeAttr(attrs, 'size');
    if (size) {
      diagram.size = size;
    }
    const rule: Semantic.GridRule = { ...readRule(attrs), ...optional('gap', numberAttr(attrs, 'gap')) };
    if (Object.keys(rule).length > 0) {
      diagram.rule = rule;
    }
    gridAttrs(attrs, ['size', 'gap', ...GRID_RULE_ATTRS]);
    if (origin) {
      diagram.origin = origin;
    }
    if (flow) {
      diagram.flow = flow;
    }
    if (grid) {
      diagram.grid = grid;
    }
    if (box) {
      diagram.box = box;
    }
    diagram.hinted ||= grid !== undefined || box !== undefined || aspect !== undefined;
  };

  /** Drops what names nothing, then forms the buses; run once every statement is read. */
  /** Statements and words one diagram kind reads and the others do not. */
  const checkKind = (): void => {
    const { kind } = diagram;
    if (kind !== 'sequence') {
      for (const { range, what } of sequenceOnly) {
        report(range, `${what} belongs in a sequence diagram; declare \`diagram kind=sequence\`.`);
      }
    }
    if (kind !== 'grid') {
      for (const { range, what } of gridOnly) {
        report(range, `${what} belongs in a grid diagram; declare \`diagram kind=grid\`.`);
      }
      // The search places one level of frames, so a group inside another gives its members to the outermost one.
      const outermost = (id: string): string => {
        const entry = nested.find((candidate) => candidate.id === id);
        return entry ? outermost(entry.outer) : id;
      };
      for (const { node, id, outer } of nested) {
        report(node, `Groups do not nest; the members of "${id}" join "${outermost(outer)}".`);
      }
      const inner = new Set(nested.map((entry) => entry.id));
      diagram.nodes.forEach((node) => node.group !== undefined && (node.group = outermost(node.group)));
      diagram.groups = diagram.groups.filter((group) => !inner.has(group.id));
    } else {
      // Every member takes the next cell of the grid it is written in, so nothing is left for a hint to steer.
      const ignored = (range: Range, what: string) =>
        report(range, `${what} is ignored in a grid diagram: the order of statements is the layout.`, 'warning');
      for (const node of diagram.nodes) {
        if (node.pin) {
          ignored(node.pin.range, 'A pin');
        }
        node.relations.forEach((relation) => ignored(relation.range, 'A placement relation'));
      }
      for (const group of diagram.groups) {
        group.relations.forEach((relation) => ignored(relation.range, 'A placement relation'));
      }
      for (const edge of diagram.edges) {
        if (edge.via.length > 0) {
          ignored(edge.via[0].range, 'A waypoint');
        } else if (edge.from.sides || edge.to.sides) {
          ignored(edge.from.sides ? edge.from.range : edge.to.range, 'A side');
        }
      }
      for (const entry of pendingBuses) {
        ignored(rangeOf(entry.node), 'A bus');
      }
      pendingBuses.length = 0;
    }
    for (const node of diagram.nodes) {
      const { role } = node;
      if (role && !Semantic.ROLES_BY_KIND[kind].includes(role)) {
        const owner = Semantic.DIAGRAM_KINDS.find((entry) => Semantic.ROLES_BY_KIND[entry].includes(role));
        report(node.range, `role=${role} belongs in a ${owner} diagram; declare \`diagram kind=${owner}\`.`);
      }
    }
    if (kind === 'sequence') {
      // Participants are columns in declaration order and messages rows in source order, so the
      // grid's placement and routing hints have nothing to steer.
      const ignored = (range: Range, what: string) =>
        report(range, `${what} is ignored in a sequence diagram: the order of statements is the layout.`, 'warning');
      for (const node of diagram.nodes) {
        if (node.pin) {
          ignored(node.pin.range, 'A pin');
        }
        node.relations.forEach((relation) => ignored(relation.range, 'A placement relation'));
      }
      for (const group of diagram.groups) {
        group.relations.forEach((relation) => ignored(relation.range, 'A placement relation'));
      }
      for (const edge of diagram.edges) {
        if (edge.via.length > 0) {
          ignored(edge.via[0].range, 'A waypoint');
        } else if (edge.from.sides || edge.to.sides) {
          ignored(edge.from.sides ? edge.from.range : edge.to.range, 'A side');
        } else if (edge.relation) {
          ignored(edge.range, `The relationship "${edge.relation}"`);
        }
      }
      for (const entry of pendingBuses) {
        ignored(rangeOf(entry.node), 'A bus');
      }
      pendingBuses.length = 0;
    }
  };

  const resolveSemantic = (): void => {
    checkKind();
    // The layout sizes a frame from its members and fails on an empty one, which is what redeclaring
    // existing nodes inside a new group leaves behind.
    const grid = diagram.kind === 'grid';
    const occupied = new Set(diagram.nodes.flatMap((node) => (node.group === undefined ? [] : [node.group])));
    // A grid keeps an empty group: it still takes its cell, which is how a column is left blank.
    diagram.groups = diagram.groups.filter((group) => {
      if (!grid && !occupied.has(group.id)) {
        report(group.range, `Group "${group.id}" has no members; declare its nodes inside its braces.`, 'warning');
      }
      return grid || occupied.has(group.id);
    });
    const nodeIds = new Set(diagram.nodes.map((node) => node.id));
    const groupIds = new Set(diagram.groups.map((group) => group.id));
    const known = (end: Semantic.End) => {
      if (grid && !nodeIds.has(end.node)) {
        // A grid's frames are boxes like any other, so a connector may end on one; and a box has places of its
        // own (a component's `frame/nav`, a port `frame#left`) that only its host can resolve, so the rest of the
        // ref is carried.
        if (groupIds.has(end.node)) {
          return true;
        }
        const cut = end.node.search(/[/#]/);
        const box = cut > 0 ? end.node.slice(0, cut) : undefined;
        if (box !== undefined && (nodeIds.has(box) || groupIds.has(box))) {
          end.part = end.node.slice(cut);
          end.node = end.node.slice(0, cut);
          return true;
        }
      }
      if (!nodeIds.has(end.node)) {
        report(end.range, `Unknown node "${end.node}"; declare it with \`node ${end.node}\`.`);
        return false;
      }
      return true;
    };
    diagram.edges = diagram.edges.filter((edge) => [edge.from, edge.to].map(known).every(Boolean));
    const knownSteps = (steps: Semantic.Step[]): Semantic.Step[] =>
      steps.filter((step) => {
        if (step.kind === 'fragment') {
          step.fragment.sections.forEach((section) => (section.steps = knownSteps(section.steps)));
        } else if (step.kind === 'note') {
          const unknown = step.note.over.filter((id) => !nodeIds.has(id));
          unknown.forEach((id) => report(step.note.range, `Unknown node "${id}"; declare it with \`node ${id}\`.`));
          return unknown.length === 0;
        }
        return true;
      });
    diagram.timeline = knownSteps(diagram.timeline);
    const checkTargets = (owner: string, relations: Semantic.Relation[], ids: Set<string>, kind: string) =>
      relations.filter((relation) => {
        if (relation.target === owner) {
          problems.push({
            severity: 'error',
            message: `"${owner}" cannot be placed relative to itself.`,
            ...relation.range,
          });
          return false;
        }
        if (!ids.has(relation.target)) {
          problems.push({ severity: 'error', message: `Unknown ${kind} "${relation.target}".`, ...relation.range });
          return false;
        }
        return true;
      });
    diagram.nodes.forEach((node) => (node.relations = checkTargets(node.id, node.relations, nodeIds, 'node')));
    diagram.groups.forEach((group) => (group.relations = checkTargets(group.id, group.relations, groupIds, 'group')));

    const live = new Set(diagram.edges);
    const byName = new Map<string, typeof pendingBuses>();
    for (const entry of pendingBuses) {
      byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry]);
    }
    for (const [name, entries] of byName) {
      const edges = entries.flatMap((entry) => entry.edges).filter((edge) => live.has(edge));
      if (edges.length < 2) {
        if (edges.length === 1) {
          problems.push({
            severity: 'warning',
            message: entries[0].named
              ? `Bus "${name}" has only one edge, so it has no trunk to share.`
              : 'A bus needs several edges from or to one node: `edge A -> B, C bus` or `edge B, C -> A bus`.',
            ...rangeOf(entries[0].node),
          });
        }
        continue;
      }
      const hubOut = edges.every((edge) => edge.from.node === edges[0].from.node);
      const hubIn = edges.every((edge) => edge.to.node === edges[0].to.node);
      if (!hubOut && !hubIn) {
        problems.push({
          severity: 'warning',
          message: `The edges of bus "${name}" share neither their source nor their target, so they are drawn apart.`,
          ...rangeOf(entries[0].node),
        });
        continue;
      }
      const direction = hubOut ? 'out' : 'in';
      const key = Semantic.busKey(hubOut ? edges[0].from.node : edges[0].to.node, name, direction);
      const label = entries.find((entry) => entry.label !== undefined)?.label;
      if (label !== undefined) {
        diagram.busLabels.set(key, label);
      }
      for (const edge of edges) {
        edge.bus = key;
      }
      const routed = edges.find((edge) => edge.via.length > 0);
      if (routed) {
        problems.push({
          severity: 'warning',
          message: 'Waypoints on a bus edge are ignored: the trunk and its spokes are routed together.',
          ...routed.via[0].range,
        });
      }
    }
  };

  const tree = parser.parse(text);

  // Error nodes first, so a report reads top-down even though the walk below revisits the tree.
  const cursor = tree.cursor();
  do {
    if (cursor.type.isError) {
      problems.push({
        severity: 'error',
        message: 'Unexpected input.',
        from: cursor.from,
        // A zero-width error node would underline nothing; give it the character it stopped on.
        to: cursor.to > cursor.from ? cursor.to : Math.min(cursor.from + 1, text.length),
      });
    }
  } while (cursor.next());

  for (const statement of childrenOf(tree.topNode)) {
    const ids = childrenOf(statement).filter((child) => child.name === 'Id');
    switch (statement.name) {
      case 'ObjectDecl': {
        if (ids.length === 0) {
          break;
        }
        // `@ <origin>` and `name=value` both arrive wrapped in an `ObjectAttr`.
        const objectAttrs = childrenOf(statement)
          .filter((child) => child.name === 'ObjectAttr')
          .flatMap(childrenOf);
        const origin = objectAttrs.find((child) => child.name === 'Origin')?.getChild('Point');
        const objectId = readId(ids[0]);
        const attrs = readAttrs(
          objectAttrs.filter((child) => child.name === 'Attribute'),
          OBJECT_ATTRS,
          `object "${objectId}"`,
        );
        ranges.set(objectId, { from: statement.from, to: statement.to });
        commands.push({
          op: 'upsert-object',
          object: {
            id: objectId,
            ...optional('origin', origin ? readPoint(origin) : undefined),
            ...optional('scale', numberAttr(attrs, 'scale')),
            ...optional('index', stringAttr(attrs, 'index')),
            ...optional('ref', stringAttr(attrs, 'ref')),
            elements: readElements(statement.getChild('Body'), objectId),
          },
        });
        break;
      }

      case 'ElementsDecl':
        if (ids.length > 0) {
          commands.push({
            op: 'upsert-elements',
            objectId: readId(ids[0]),
            elements: readElements(statement.getChild('Body'), readId(ids[0])),
          });
        }
        break;

      case 'MoveStmt': {
        const point = statement.getChild('Origin')?.getChild('Point');
        const origin = point && readPoint(point);
        if (ids.length > 0 && origin) {
          commands.push({ op: 'move-object', objectId: readId(ids[0]), origin });
        }
        break;
      }

      case 'RemoveObjectStmt':
        if (ids.length > 0) {
          commands.push({ op: 'remove-object', objectId: readId(ids[0]) });
        }
        break;

      case 'RemoveElementsStmt':
        if (ids.length > 1) {
          commands.push({
            op: 'remove-elements',
            objectId: readId(ids[0]),
            elementIds: ids.slice(1).map(readId),
          });
        }
        break;

      case 'DiagramDecl':
        semantic = true;
        readDiagram(statement);
        break;

      case 'GroupDecl':
        semantic = true;
        readGroup(statement, undefined);
        break;

      case 'NodeDecl':
        semantic = true;
        readNode(statement, undefined);
        break;

      case 'EdgeDecl':
        semantic = true;
        readEdge(statement);
        break;

      case 'NoteDecl':
      case 'FragmentDecl':
        semantic = true;
        readStep(statement);
        break;
    }
  }

  if (!semantic) {
    return { commands, problems, ranges };
  }
  resolveSemantic();
  // The layout emits objects named after nodes and groups, plus one `edges` object; a scene
  // statement claiming one of those ids would silently replace part of the diagram.
  const claimed = new Set(
    diagram.kind === 'grid'
      ? [GridEngine.OBJECT]
      : [...diagram.nodes.map((node) => node.id), ...diagram.groups.map((group) => group.id), 'edges'],
  );
  for (const command of commands) {
    if (command.op === 'upsert-object' && claimed.has(command.object.id) && diagram.nodes.length > 0) {
      const range = ranges.get(command.object.id);
      problems.push({
        severity: 'warning',
        message: `object "${command.object.id}" replaces the laid-out ${command.object.id === 'edges' ? 'connectors' : `"${command.object.id}"`}; use \`elements ${command.object.id} { … }\` to add to it instead.`,
        from: range?.from ?? 0,
        to: range?.to ?? 0,
      });
    }
  }
  return { commands, problems, ranges, diagram };
};

/** A reading with its semantic diagram laid out: the layout's commands first, then the scene statements. */
export const withLayout = (
  reading: Reading,
  solution?: Pick<SemanticEngine.Solution, 'commands' | 'issues'>,
): ParseResult => ({
  commands: solution ? [...solution.commands, ...reading.commands] : reading.commands,
  problems: [...reading.problems, ...(solution?.issues ?? [])],
  ranges: reading.ranges,
});

/** The layout of a diagram by the engine its kind names; the search is the synchronous one. */
const solve = (diagram: Semantic.Diagram): Pick<SemanticEngine.Solution, 'commands' | 'issues'> => {
  switch (diagram.kind) {
    case 'sequence':
      return SequenceEngine.solve(diagram);
    case 'grid':
      return GridEngine.solve(diagram);
    default:
      return SemanticEngine.solve(diagram);
  }
};

/**
 * Reads a document and lays out its semantic statements with the grid search, synchronously, so
 * an editor can lint and preview it; see {@link compile} for the full search.
 */
export const parse = (text: string): ParseResult => {
  const reading = read(text);
  const { diagram } = reading;
  return withLayout(reading, diagram && solve(diagram));
};

/** Applies commands in order, the same semantics `Scene.Command` documents. */
export const toScene = (commands: readonly Scene.Command[]): Scene.Scene => {
  const objects: Scene.WorldObject[] = [];
  const indexOf = (id: string) => objects.findIndex((object) => object.id === id);

  for (const command of commands) {
    switch (command.op) {
      case 'upsert-object': {
        const at = indexOf(command.object.id);
        if (at === -1) {
          objects.push(command.object);
        } else {
          // `WorldObject.origin` is documented as "omit on upsert to keep the current position",
          // which is also what the canvas builder does — diverging here would give the bench and
          // the linter a different scene than the drawing actually holds.
          const { origin } = objects[at];
          objects[at] =
            command.object.origin === undefined && origin !== undefined
              ? { ...command.object, origin }
              : command.object;
        }
        break;
      }
      case 'upsert-elements': {
        const at = indexOf(command.objectId);
        if (at !== -1) {
          const replaced = new Set(command.elements.map((element) => element.id));
          objects[at] = {
            ...objects[at],
            elements: [...objects[at].elements.filter((element) => !replaced.has(element.id)), ...command.elements],
          };
        }
        break;
      }
      case 'remove-elements': {
        const at = indexOf(command.objectId);
        if (at !== -1) {
          const removed = new Set(command.elementIds);
          objects[at] = {
            ...objects[at],
            elements: objects[at].elements.filter((element) => !removed.has(element.id)),
          };
        }
        break;
      }
      case 'remove-object': {
        const at = indexOf(command.objectId);
        if (at !== -1) {
          objects.splice(at, 1);
        }
        break;
      }
      case 'move-object': {
        const at = indexOf(command.objectId);
        if (at !== -1) {
          objects[at] = { ...objects[at], origin: command.origin };
        }
        break;
      }
    }
  }

  return { objects };
};

/** Convenience for the common case: a scene document, with whatever problems it carried. */
export const parseScene = (text: string): { scene: Scene.Scene; problems: Problem[] } => {
  const { commands, problems } = parse(text);
  return { scene: toScene(commands), problems };
};
