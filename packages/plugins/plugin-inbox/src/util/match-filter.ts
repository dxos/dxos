//
// Copyright 2026 DXOS.org
//

import { type Filter, type Tag } from '@dxos/echo';
import { type Message } from '@dxos/types';

/**
 * Evaluate a parsed Filter AST against a Message client-side.
 *
 * Feed/queue queries don't yet support text-search and complex filter combinations,
 * so the mailbox UI fetches all messages from the feed and applies the user filter here.
 */
export const matchesFilter = (filter: Filter.Any, message: Message.Message, tags: Tag.Tag[]): boolean => {
  return matchesAst(filter.ast, message, tags);
};

const matchesAst = (ast: any, message: Message.Message, tags: Tag.Tag[]): boolean => {
  switch (ast.type) {
    case 'and':
      return (ast.filters as any[]).every((f) => matchesAst(f, message, tags));
    case 'or':
      return (ast.filters as any[]).some((f) => matchesAst(f, message, tags));
    case 'not':
      return !matchesAst(ast.filter, message, tags);
    case 'tag':
      return tags.some((tag) => tag.id === ast.tag);
    case 'text-search':
      return matchesText(ast.text ?? '', message);
    case 'object': {
      // Filter.everything() and Filter.typename() emit `{ type: 'object', props: {} }`;
      // typename pre-filtering happens at the query layer, so here an empty props means match-all.
      if (ast.props) {
        for (const [key, predicate] of Object.entries(ast.props)) {
          const path = resolvePropertyAlias(key);
          if (!matchesPredicate(predicate, getPath(message, path), message, tags)) {
            return false;
          }
        }
      }
      return true;
    }
    default:
      // Unknown / unsupported AST node — fail closed so unhandled filters never silently broaden results.
      return false;
  }
};

const matchesPredicate = (ast: any, value: any, message: Message.Message, tags: Tag.Tag[]): boolean => {
  switch (ast?.type) {
    case 'compare': {
      switch (ast.operator) {
        case 'eq':
          return matchesValue(value, ast.value);
        case 'neq':
          return !matchesValue(value, ast.value);
        case 'gt':
          return value > ast.value;
        case 'gte':
          return value >= ast.value;
        case 'lt':
          return value < ast.value;
        case 'lte':
          return value <= ast.value;
        default:
          return false;
      }
    }
    case 'object': {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      for (const [key, sub] of Object.entries(ast.props ?? {})) {
        if (!matchesPredicate(sub, getPath(value, key), message, tags)) {
          return false;
        }
      }
      return true;
    }
    default:
      return matchesAst(ast, message, tags);
  }
};

/**
 * Match a property value against a query value.
 * - Strings: case-insensitive substring match (so `from:rich` matches `rich@dxos.org`).
 * - Objects: recurse into fields (so `from:rich` matches an Actor's `email` or `name`).
 * - Arrays: any element matches.
 * - Other primitives: strict equality.
 */
const matchesValue = (value: any, query: any): boolean => {
  if (value === query) {
    return true;
  }
  if (typeof query === 'string' && typeof value === 'string') {
    return value.toLowerCase().includes(query.toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((v) => matchesValue(v, query));
  }
  if (typeof query === 'string' && typeof value === 'object' && value !== null) {
    return Object.values(value).some((v) => matchesValue(v, query));
  }
  return false;
};

const getPath = (obj: any, path: string): any => {
  return path.split('.').reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), obj);
};

/**
 * User-facing aliases that map common email-style property names onto Message fields.
 */
const PROPERTY_ALIASES: Record<string, string> = {
  from: 'sender',
  to: 'properties.to',
};

const resolvePropertyAlias = (path: string): string => {
  for (const [alias, target] of Object.entries(PROPERTY_ALIASES)) {
    if (path === alias) {
      return target;
    }
    if (path.startsWith(alias + '.')) {
      return target + path.slice(alias.length);
    }
  }
  return path;
};

const matchesText = (needle: string, message: Message.Message): boolean => {
  if (!needle) {
    return true;
  }
  const lower = needle.toLowerCase();
  const haystacks: string[] = [];
  if (message.properties) {
    for (const value of Object.values(message.properties)) {
      if (typeof value === 'string') {
        haystacks.push(value);
      }
    }
  }
  if (message.sender) {
    if (message.sender.email) {
      haystacks.push(message.sender.email);
    }
    if (message.sender.name) {
      haystacks.push(message.sender.name);
    }
  }
  for (const block of message.blocks ?? []) {
    if (block && typeof (block as any).text === 'string') {
      haystacks.push((block as any).text);
    }
  }
  return haystacks.some((s) => s.toLowerCase().includes(lower));
};
