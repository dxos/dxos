//
// Copyright 2025 DXOS.org
//

import { type Parser, type Tree, type TreeCursor } from '@lezer/common';

import { Filter } from '@dxos/client/echo';

/**
 * Build a query from a parsed DSL tree.
 */
export const buildQuery = (tree: Tree, input: string, parser?: Parser): Filter.Any => {
  const cursor = tree.cursor();

  // Start at root (Query node).
  if (cursor.node.name !== 'Query') {
    return Filter.nothing();
  }

  // Check if Query has multiple children (binary expression).
  const children: Array<{ name: string; from: number; to: number }> = [];
  if (cursor.firstChild()) {
    do {
      children.push({ name: cursor.node.name, from: cursor.from, to: cursor.to });
    } while (cursor.nextSibling());
    cursor.parent();
  }

  // If we have an operator in the children, parse as binary expression.
  const hasOperator = children.some((child) => child.name === 'And' || child.name === 'Or');
  if (hasOperator) {
    return parseBinaryExpression(cursor, input, parser);
  }

  // Otherwise, parse the single expression.
  if (!cursor.firstChild()) {
    return Filter.nothing();
  }

  return parseExpression(cursor, input, parser);
};

/**
 * Parse an expression node.
 */
const parseExpression = (cursor: TreeCursor, input: string, parser?: Parser): Filter.Any => {
  const nodeName = cursor.node.name;

  switch (nodeName) {
    case 'Filter':
      return parseFilter(cursor, input, parser);

    case 'Not': {
      // Move past NOT token to the expression.
      cursor.nextSibling();
      const notFilter = parseExpression(cursor, input, parser);
      return Filter.not(notFilter);
    }

    case 'And':
    case 'Or':
      // This is the operator node, we need to handle the binary expression.
      // The cursor is positioned at the operator, we need to go back to parent.
      cursor.parent();
      return parseBinaryExpression(cursor, input, parser);

    case '(': {
      // Skip opening paren.
      cursor.nextSibling();
      const parenFilter = parseExpression(cursor, input, parser);
      // Skip closing paren.
      cursor.nextSibling();
      return parenFilter;
    }

    default: {
      // Check if this is a binary expression (has And/Or as a child).
      const savedPos = cursor.from;
      if (cursor.firstChild()) {
        // Look for And/Or operators.
        let hasOperator = false;
        do {
          if (cursor.node.name === 'And' || cursor.node.name === 'Or') {
            hasOperator = true;
            break;
          }
        } while (cursor.nextSibling());

        // Reset cursor to the saved position.
        cursor.parent();
        cursor.firstChild();
        while (cursor.from !== savedPos && cursor.nextSibling()) {}

        if (hasOperator) {
          cursor.parent();
          return parseBinaryExpression(cursor, input, parser);
        } else {
          const result = parseExpression(cursor, input, parser);
          cursor.parent();
          return result;
        }
      }
      return Filter.nothing();
    }
  }
};

/**
 * Parse a binary expression (AND/OR).
 */
const parseBinaryExpression = (cursor: TreeCursor, input: string, parser?: Parser): Filter.Any => {
  const filters: Filter.Any[] = [];
  let operator: 'and' | 'or' | null = null;

  // Collect all filters and operators.
  if (cursor.firstChild()) {
    do {
      const nodeName = cursor.node.name;

      if (nodeName === 'And' || nodeName === 'Or') {
        operator = nodeName.toLowerCase() as 'and' | 'or';
      } else if (nodeName === '(') {
        // Handle parenthesized expression.
        // Look ahead to see if this is a binary expression.
        const savedPos = cursor.from;
        cursor.nextSibling(); // Move past '('

        // Check if the parentheses contain a binary expression.
        let hasBinaryOp = false;
        do {
          if (cursor.node.name === 'And' || cursor.node.name === 'Or') {
            hasBinaryOp = true;
            break;
          }
        } while (cursor.nextSibling() && cursor.node.name !== ')');

        // Reset cursor to start of parenthesized content.
        cursor.parent();
        cursor.firstChild();
        while (cursor.from !== savedPos && cursor.nextSibling()) {}
        cursor.nextSibling(); // Move past '(' again.

        if (hasBinaryOp) {
          // Find the matching closing parenthesis.
          let depth = 1;
          const exprStart = cursor.from;
          let exprEnd = cursor.to;

          while (cursor.nextSibling() && depth > 0) {
            if (cursor.node.name === '(') depth++;
            else if (cursor.node.name === ')') {
              depth--;
              if (depth === 0) {
                exprEnd = cursor.from;
              }
            }
          }

          // Parse the expression inside parentheses as a subtree.
          const subInput = input.slice(exprStart, exprEnd);
          if (parser) {
            const subTree = parser.parse(subInput);
            filters.push(buildQuery(subTree, subInput, parser));
          } else {
            // Fallback: treat as simple expression.
            filters.push(parseExpression(cursor, input, parser));
            while (cursor.nextSibling() && cursor.node.name !== ')') {}
          }
        } else {
          // Simple parenthesized expression.
          filters.push(parseExpression(cursor, input, parser));
          // Skip until we find the closing parenthesis.
          while (cursor.nextSibling() && cursor.node.name !== ')') {}
        }
      } else if (nodeName !== ')') {
        filters.push(parseExpression(cursor, input, parser));
      }
    } while (cursor.nextSibling());

    cursor.parent();
  }

  if (filters.length === 0) {
    return Filter.nothing();
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return operator === 'or' ? Filter.or(...filters) : Filter.and(...filters);
};

/**
 * Parse a Filter node.
 */
const parseFilter = (cursor: TreeCursor, input: string, _parser?: Parser): Filter.Any => {
  if (!cursor.firstChild()) {
    return Filter.nothing();
  }

  const filterType = cursor.node.name;
  let result: Filter.Any;

  switch (filterType) {
    case 'TypeFilter':
      result = parseTypeFilter(cursor, input);
      break;

    case 'ObjectLiteral':
      result = parseObjectLiteral(cursor, input);
      break;

    case 'PropertyFilter':
      result = parsePropertyFilter(cursor, input);
      break;

    default:
      result = Filter.nothing();
  }

  cursor.parent();
  return result;
};

/**
 * Parse a TypeFilter node (type:typename).
 */
const parseTypeFilter = (cursor: TreeCursor, input: string): Filter.Any => {
  // Skip TypeKeyword
  cursor.firstChild();
  cursor.nextSibling(); // Skip ':'
  cursor.nextSibling(); // Move to Identifier

  const typename = getNodeText(cursor, input);
  cursor.parent();

  return Filter.typename(typename);
};

/**
 * Parse an ObjectLiteral node.
 */
const parseObjectLiteral = (cursor: TreeCursor, input: string): Filter.Any => {
  const props: Record<string, any> = {};

  if (cursor.firstChild()) {
    do {
      if (cursor.node.name === 'ObjectProperty') {
        const { key, value } = parseObjectProperty(cursor, input);
        if (key) {
          props[key] = value;
        }
      }
    } while (cursor.nextSibling());

    cursor.parent();
  }

  return Filter._props(props);
};

/**
 * Parse an ObjectProperty node.
 */
const parseObjectProperty = (cursor: TreeCursor, input: string): { key: string | null; value: any } => {
  let key: string | null = null;
  let value: any = null;

  if (cursor.firstChild()) {
    // First child is PropertyKey
    if (cursor.node.name === 'PropertyKey' && cursor.firstChild()) {
      key = getNodeText(cursor, input);
      cursor.parent();
    }

    // Skip ':' and move to Value
    cursor.nextSibling();
    cursor.nextSibling();

    if (cursor.node.name === 'Value' && cursor.firstChild()) {
      value = parseValue(cursor, input);
      cursor.parent();
    }

    cursor.parent();
  }

  return { key, value };
};

/**
 * Parse a PropertyFilter node (property:value).
 */
const parsePropertyFilter = (cursor: TreeCursor, input: string): Filter.Any => {
  let path: string | null = null;
  let value: any = null;

  if (cursor.firstChild()) {
    // First child is PropertyPath
    if (cursor.node.name === 'PropertyPath') {
      path = parsePropertyPath(cursor, input);
    }

    // Skip ':' and move to Value
    cursor.nextSibling();
    cursor.nextSibling();

    if (cursor.node.name === 'Value' && cursor.firstChild()) {
      value = parseValue(cursor, input);
      cursor.parent();
    }

    cursor.parent();
  }

  if (!path) {
    return Filter.nothing();
  }

  return Filter._props({ [path]: value });
};

/**
 * Parse a PropertyPath node (supports dot notation).
 */
const parsePropertyPath = (cursor: TreeCursor, input: string): string => {
  const parts: string[] = [];

  if (cursor.firstChild()) {
    do {
      if (cursor.node.name === 'Identifier') {
        parts.push(getNodeText(cursor, input));
      }
    } while (cursor.nextSibling());

    cursor.parent();
  }

  return parts.join('.');
};

/**
 * Parse a Value node.
 */
const parseValue = (cursor: TreeCursor, input: string): any => {
  const valueType = cursor.node.name;

  switch (valueType) {
    case 'String': {
      // Remove quotes
      const str = getNodeText(cursor, input);
      return str.slice(1, -1);
    }

    case 'Number':
      return Number(getNodeText(cursor, input));

    case 'Boolean':
      return getNodeText(cursor, input) === 'true';

    case 'Null':
      return null;

    case 'ObjectLiteral': {
      // For nested objects, parse recursively
      const props: Record<string, any> = {};
      if (cursor.firstChild()) {
        do {
          if (cursor.node.name === 'ObjectProperty') {
            const { key, value } = parseObjectProperty(cursor, input);
            if (key) {
              props[key] = value;
            }
          }
        } while (cursor.nextSibling());
        cursor.parent();
      }
      return props;
    }

    case 'ArrayLiteral': {
      // Parse array values
      const array: any[] = [];
      if (cursor.firstChild()) {
        do {
          if (cursor.node.name === 'Value' && cursor.firstChild()) {
            array.push(parseValue(cursor, input));
            cursor.parent();
          }
        } while (cursor.nextSibling());
        cursor.parent();
      }
      return array;
    }

    default:
      return null;
  }
};

/**
 * Get the text content of the current node.
 */
const getNodeText = (cursor: TreeCursor, input: string): string => {
  return input.slice(cursor.from, cursor.to);
};
