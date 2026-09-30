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
import {
  type AttrSpec,
  ELEMENT_ATTRS,
  ELEMENT_KINDS,
  type ElementKind,
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
