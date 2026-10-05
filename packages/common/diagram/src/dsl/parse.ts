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

import * as Scene from '../scene.ts';
import * as SemanticEngine from '../semantic-engine.ts';
import * as Semantic from '../semantic.ts';
import { parser } from './gen/diagram.ts';
import {
  type AttrSpec,
  DIAGRAM_ATTRS,
  EDGE_ATTRS,
  ELEMENT_ATTRS,
  ELEMENT_KINDS,
  type ElementKind,
  GROUP_ATTRS,
  NODE_ATTRS,
  OBJECT_ATTRS,
  REF_SHAPE,
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

const unquote = (raw: string): string =>
  raw.slice(1, -1).replace(/\\(.)/g, (_match, character: string) => ESCAPES[character] ?? character);

/** Spreads a field only when it is set, so an absent option never becomes an explicit `undefined`. */
const optional = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } => {
  const result: { [P in K]?: V } = {};
  if (value !== undefined) {
    result[key] = value;
  }
  return result;
};

/** Single-kind element nodes; the multi-kind ones carry a `BoxKind`/`PathKind` child instead. */
const SHAPE_KINDS: Record<string, string | undefined> = {
  CircleElement: 'circle',
  ArcElement: 'arc',
  TextElement: 'text',
  ArrowElement: 'arrow',
  PortalElement: 'portal',
};

/** The DSL word for an element, which is also its scene `kind`. */
const kindOf = (shapeName: string, keyword: string | undefined): ElementKind | undefined => {
  const word = keyword ?? SHAPE_KINDS[shapeName];
  return ELEMENT_KINDS.find((kind) => kind === word);
};

const childrenOf = (node: SyntaxNode): SyntaxNode[] => {
  const children: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    children.push(child);
  }
  return children;
};

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
  const readNumber = (node: SyntaxNode): number | undefined => {
    const value = Number.parseFloat(slice(node));
    if (!Number.isFinite(value)) {
      report(node, `"${slice(node)}" is not a finite number.`);
      return undefined;
    }
    return value;
  };

  // Error recovery can leave a `Point` or `Range` holding one number instead of two, so every
  // reader returns undefined rather than indexing past the end — `parse` reports problems, and a
  // reader that threw would take the whole document down with the line being typed.
  const readPoint = (node: SyntaxNode): Scene.Point | undefined => {
    const [first, second] = childrenOf(node).filter((child) => child.name === 'Number');
    const [x, y] = [first && readNumber(first), second && readNumber(second)];
    return x !== undefined && y !== undefined ? { x, y } : undefined;
  };

  // `100x50`; `x` appears only as the separator, so a negative extent needs no special case.
  const readSize = (node: SyntaxNode): { w: number; h: number } | undefined => {
    const [width, height] = slice(node).split('x').map(Number.parseFloat);
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

  /** The four style fields every element shares. */
  const readStyle = (attrs: Map<string, Attr>) => ({
    ...optional('color', enumAttr(attrs, 'color', Scene.Color.literals)),
    ...optional('fill', enumAttr(attrs, 'fill', Scene.Fill.literals)),
    ...optional('stroke', enumAttr(attrs, 'stroke', Scene.Stroke.literals)),
    ...optional('weight', enumAttr(attrs, 'weight', Scene.Weight.literals)),
  });

  const readEndpoint = (node: SyntaxNode): { ref?: string; point?: Scene.Point } => {
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
  const readPoints = (nodes: SyntaxNode[]): Scene.Point[] =>
    nodes.flatMap((node) => {
      const point = readPoint(node);
      return point ? [point] : [];
    });

  const readElement = (node: SyntaxNode): Scene.Element | undefined => {
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

    const attrs = readAttrs(
      parts.filter((part) => part.name === 'Attribute'),
      ELEMENT_ATTRS[kind],
      `${kind} "${id}"`,
    );
    const style = readStyle(attrs);

    switch (kind) {
      case 'rect':
      case 'ellipse':
      case 'diamond':
      case 'triangle': {
        const sizeNode = parts.find((part) => part.name === 'Size');
        const origin = points[0] && readPoint(points[0]);
        const size = sizeNode && readSize(sizeNode);
        if (!origin || !size) {
          return undefined;
        }
        return {
          kind,
          id,
          x: origin.x,
          y: origin.y,
          ...size,
          ...optional('rotation', numberAttr(attrs, 'rotation')),
          ...optional('text', text),
          ...optional('corners', enumAttr(attrs, 'corners', Scene.Corners.literals)),
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
        return {
          kind,
          id,
          ...optional('from', from?.ref),
          ...optional('to', to?.ref),
          ...optional('start', from?.point),
          ...optional('end', to?.point),
          ...optional('text', text),
          ...optional('head', enumAttr(attrs, 'head', Scene.ArrowHead.literals)),
          ...optional('tail', enumAttr(attrs, 'tail', Scene.ArrowTail.literals)),
          ...optional('relation', enumAttr(attrs, 'relation', Scene.Relation.literals)),
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

  const readElements = (body: SyntaxNode | null, objectId: string): Scene.Element[] =>
    body
      ? childrenOf(body)
          .filter((child) => child.name === 'Element')
          .flatMap((child) => {
            const element = readElement(child);
            if (!element) {
              return [];
            }
            ranges.set(`${objectId}/${element.id}`, { from: child.from, to: child.to });
            return [element];
          })
      : [];

  //
  // Semantic statements, collected into one diagram and checked once every statement is read, since
  // an edge may name a node declared further down.
  //

  const diagram = Semantic.empty();
  let semantic = false;
  const rangeOf = (node: SyntaxNode): Range => ({ from: node.from, to: node.to });

  const sizeAttr = (attrs: Map<string, Attr>, name: string): Semantic.Size | undefined => {
    const attr = attrs.get(name);
    if (!attr) {
      return undefined;
    }
    const raw = slice(attr.valueNode);
    const [width, height] = raw.split('x').map(Number.parseFloat);
    if (!/^[^x]+x[^x]+$/.test(raw) || !(width > 0) || !(height > 0)) {
      report(attr.node, `"${name}" takes a size like 384x224.`);
      return undefined;
    }
    return { w: width, h: height };
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
    const attrs = readAttrs(attributesOf(statement), NODE_ATTRS, `node "${id}"`);
    const pins = childrenOf(statement).filter((child) => child.name === 'Pin');
    if (pins.length > 1) {
      report(pins[1], `node "${id}" has more than one pin.`);
    }
    if (diagram.nodes.some((node) => node.id === id) || diagram.groups.some((entry) => entry.id === id)) {
      report(idNode, `"${id}" is already declared.`);
      return;
    }
    const pin = readPin(statement);
    const relations = readRelations(statement);
    diagram.hinted ||= pin !== undefined || relations.length > 0;
    diagram.nodes.push({
      id,
      label: label ? unquote(slice(label)) : id,
      relations,
      range: rangeOf(statement),
      ...optional('group', group),
      ...optional('pin', pin),
      ...optional('ref', stringAttr(attrs, 'ref')),
      ...optional('shape', enumAttr(attrs, 'shape', Scene.BoxKind.literals)),
      ...optional('color', enumAttr(attrs, 'color', Scene.Color.literals)),
      ...optional('fill', enumAttr(attrs, 'fill', Scene.Fill.literals)),
      ...optional('stroke', enumAttr(attrs, 'stroke', Scene.Stroke.literals)),
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
    return { node: readId(idNode), range: rangeOf(node), ...optional('sides', sides?.length ? sides : undefined) };
  };

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
    const relation = word ? Semantic.RELATIONSHIPS[op] : undefined;
    if (word && !relation) {
      report(
        word,
        `Unknown relationship "${op}"; use ->, <->, -- or one of: ${Object.keys(Semantic.RELATIONSHIPS).join(', ')}.`,
      );
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
      ...optional('head', op === '--' ? 'none' : enumAttr(attrs, 'head', Scene.ArrowHead.literals)),
      ...optional('tail', enumAttr(attrs, 'tail', Scene.ArrowTail.literals)),
      ...optional('stroke', enumAttr(attrs, 'stroke', Scene.Stroke.literals)),
      ...optional('color', enumAttr(attrs, 'color', Scene.Color.literals)),
    };
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
          // A trunk carries the statement's label; the reverse of a two-way edge repeats nothing.
          ...optional('label', busTrunk || position > 0 ? undefined : text),
        };
        diagram.edges.push(edge);
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

  const readGroup = (statement: SyntaxNode, outer: string | undefined): void => {
    const idNode = statement.getChild('Id');
    if (!idNode) {
      return;
    }
    const id = readId(idNode);
    if (outer !== undefined) {
      report(idNode, `Groups do not nest; the members of "${id}" join "${outer}".`);
    } else if (diagram.groups.some((group) => group.id === id) || diagram.nodes.some((node) => node.id === id)) {
      report(idNode, `"${id}" is already declared.`);
    } else {
      const label = statement.getChild('Label');
      const attrs = readAttrs(attributesOf(statement), GROUP_ATTRS, `group "${id}"`);
      const relations = readRelations(statement);
      const gap = numberAttr(attrs, 'gap');
      diagram.hinted ||= relations.length > 0 || gap !== undefined;
      diagram.groups.push({
        id,
        label: label ? unquote(slice(label)) : id,
        relations,
        range: rangeOf(statement),
        ...optional('gap', gap),
        ...optional('color', enumAttr(attrs, 'color', Scene.Color.literals)),
      });
      ranges.set(id, rangeOf(statement));
    }
    const owner = outer ?? id;
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
    const grid = sizeAttr(attrs, 'grid');
    const box = sizeAttr(attrs, 'box');
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
    diagram.hinted ||= grid !== undefined || box !== undefined;
  };

  /** Drops what names nothing, then forms the buses; run once every statement is read. */
  const resolveSemantic = (): void => {
    const nodeIds = new Set(diagram.nodes.map((node) => node.id));
    const groupIds = new Set(diagram.groups.map((group) => group.id));
    const known = (end: Semantic.End) => {
      if (!nodeIds.has(end.node)) {
        report(end.range, `Unknown node "${end.node}"; declare it with \`node ${end.node}\`.`);
        return false;
      }
      return true;
    };
    diagram.edges = diagram.edges.filter((edge) => [edge.from, edge.to].map(known).every(Boolean));
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
    }
  }

  if (!semantic) {
    return { commands, problems, ranges };
  }
  resolveSemantic();
  // The layout emits objects named after nodes and groups, plus one `edges` object; a scene
  // statement claiming one of those ids would silently replace part of the diagram.
  const claimed = new Set([
    ...diagram.nodes.map((node) => node.id),
    ...diagram.groups.map((group) => group.id),
    'edges',
  ]);
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
export const withLayout = (reading: Reading, solution?: SemanticEngine.Solution): ParseResult => ({
  commands: solution ? [...solution.commands, ...reading.commands] : reading.commands,
  problems: [...reading.problems, ...(solution?.issues ?? [])],
  ranges: reading.ranges,
});

/**
 * Reads a document and lays out its semantic statements with the grid search, synchronously, so
 * an editor can lint and preview it; see {@link compile} for the full search.
 */
export const parse = (text: string): ParseResult => {
  const reading = read(text);
  return withLayout(reading, reading.diagram && SemanticEngine.solve(reading.diagram));
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
