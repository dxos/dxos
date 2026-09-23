//
// Copyright 2026 DXOS.org
//

export { type ParseResult, type Problem, parse, parseScene, toScene } from './parse.ts';
export { formatCommand, formatElement, formatId, formatObject, formatString, print, printCommands } from './print.ts';
export {
  type AttrSpec,
  type AttrType,
  type ElementKind,
  ELEMENT_ATTRS,
  ELEMENT_KINDS,
  OBJECT_ATTRS,
  RESERVED,
  STATEMENT_KEYWORDS,
} from './vocabulary.ts';
export { parser } from './gen/diagram.ts';
