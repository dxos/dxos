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
import { parser } from './gen/diagram.ts';
import { type AttrSpec, BARE_REF, ELEMENT_ATTRS, ELEMENT_KINDS, type ElementKind, OBJECT_ATTRS } from './vocabulary.ts';

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

/**
 * Reads a document. Syntax errors are reported rather than thrown, and the commands that did parse
 * are returned alongside them, so an editor can keep rendering the last good shapes while a line
 * is half-typed.
 */
export const parse = (text: string): ParseResult => {
  const problems: Problem[] = [];
  const commands: Scene.Command[] = [];
  const ranges = new Map<string, Range>();

  const slice = (node: SyntaxNode): string => text.slice(node.from, node.to);

  const report = (node: SyntaxNode, message: string, severity: Problem['severity'] = 'error'): void => {
    problems.push({ severity, message, from: node.from, to: node.to });
  };

  const readId = (node: SyntaxNode): string => {
    const raw = slice(node);
    return raw.startsWith('"') ? unquote(raw) : raw;
  };

  const readNumber = (node: SyntaxNode): number => Number.parseFloat(slice(node));

  const readPoint = (node: SyntaxNode): Scene.Point => {
    const [x, y] = childrenOf(node).filter((child) => child.name === 'Number');
    return { x: readNumber(x), y: readNumber(y) };
  };

  // `100x50`; `x` appears only as the separator, so a negative extent needs no special case.
  const readSize = (node: SyntaxNode): { w: number; h: number } => {
    const [w, h] = slice(node).split('x');
    return { w: Number.parseFloat(w), h: Number.parseFloat(h) };
  };

  const readRange = (node: SyntaxNode): { startAngle: number; endAngle: number } => {
    const [start, end] = childrenOf(node).filter((child) => child.name === 'Number');
    return { startAngle: readNumber(start), endAngle: readNumber(end) };
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
    if (Number.isNaN(value)) {
      report(attr.node, `"${name}" takes a number.`);
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
        if (!BARE_REF.test(raw)) {
          report(child, `"${raw}" is not a ref; write element, object/element, or either with #port.`);
        }
        return { ref: raw };
      }
      default:
        return {};
    }
  };

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
        if (!sizeNode || points.length === 0) {
          return undefined;
        }
        const { x, y } = readPoint(points[0]);
        return {
          kind,
          id,
          x,
          y,
          ...readSize(sizeNode),
          ...optional('rotation', numberAttr(attrs, 'rotation')),
          ...optional('text', text),
          ...optional('corners', enumAttr(attrs, 'corners', Scene.Corners.literals)),
          ...style,
        };
      }

      case 'circle': {
        const radius = parts.find((part) => part.name === 'Number');
        if (!radius || points.length === 0) {
          return undefined;
        }
        const { x, y } = readPoint(points[0]);
        return { kind, id, cx: x, cy: y, r: readNumber(radius), ...optional('text', text), ...style };
      }

      case 'line':
        return {
          kind,
          id,
          points: points.map(readPoint),
          ...optional('closed', booleanAttr(attrs, 'closed')),
          ...style,
        };

      case 'curve':
        return { kind, id, points: points.map(readPoint), ...style };

      case 'arc': {
        const radius = parts.find((part) => part.name === 'Number');
        const range = parts.find((part) => part.name === 'Range');
        if (!radius || !range || points.length === 0) {
          return undefined;
        }
        const { x, y } = readPoint(points[0]);
        return { kind, id, cx: x, cy: y, r: readNumber(radius), ...readRange(range), ...style };
      }

      case 'text': {
        if (points.length === 0 || text === undefined) {
          return undefined;
        }
        const { x, y } = readPoint(points[0]);
        return { kind, id, x, y, text, ...optional('w', numberAttr(attrs, 'w')), ...style };
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
          ...style,
        };
      }

      case 'portal': {
        const sizeNode = parts.find((part) => part.name === 'Size');
        if (!sizeNode || points.length === 0) {
          return undefined;
        }
        const { x, y } = readPoint(points[0]);
        const ref = stringAttr(attrs, 'ref');
        if (ref === undefined) {
          report(shape, `portal "${id}" needs ref="<dxn>": it is the drawing shown inside the frame.`);
          return undefined;
        }
        return { kind, id, x, y, ...readSize(sizeNode), ref, ...optional('text', text), ...style };
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
        if (ids.length > 0 && point) {
          commands.push({ op: 'move-object', objectId: readId(ids[0]), origin: readPoint(point) });
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
    }
  }

  return { commands, problems, ranges };
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
          objects[at] = command.object;
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
