//
// Copyright 2025 DXOS.org
//

import { type Parser, type Tree, type TreeCursor } from '@lezer/common';

import { Filter, type Tag } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { QueryDSL } from './gen';

// TODO(burdon): Return Query AST.
export type BuildResult = { filter?: Filter.Any; name?: string };

/**
 * Stateless query builder that parses DSL trees into filters.
 *
 * NOTE: QueryBuilder was largely developed using Claude Sonnet 4.5 (in Windsurf)..
 * To modify the functionality, create a minimal breaking test and direct the LLM to fix either the grammar or builder.
 */
export class QueryBuilder {
  private readonly _parser: Parser = QueryDSL.Parser.configure({ strict: true });

  constructor(private readonly _tags?: Tag.Map) {}

  /**
   * Check valid input.
   */
  validate(input: string): boolean {
    try {
      const tree = this._parser.parse(input);
      return tree.cursor().node.name === 'Query';
    } catch {
      return false;
    }
  }

  /**
   * Build a query from the input string.
   */
  build(input: string): BuildResult {
    try {
      const tree = this._parser.parse(input);
      return this.buildQuery(tree, input);
    } catch {
      return {};
    }
  }

  /**
   * Build a query from a parsed DSL tree.
   */
  buildQuery(tree: Tree, input: string): BuildResult {
    const cursor = tree.cursor();

    // Start at root (Query node).
    if (cursor.node.name !== 'Query') {
      return {};
    }

    // Check if Query has multiple children (binary expression).
    const children: Array<{ name: string; from: number; to: number }> = [];
    if (cursor.firstChild()) {
      do {
        children.push({ name: cursor.node.name, from: cursor.from, to: cursor.to });
      } while (cursor.nextSibling());
      cursor.parent();
    }

    // Check if this is an assignment.
    const hasAssignment = children.some((child) => child.name === 'Assignment');
    if (hasAssignment) {
      return this._parseAssignment(cursor, input);
    }

    // If we have an operator in the children, or multiple expressions (implicit AND), parse as binary expression.
    const hasOperator = children.some((child) => child.name === 'And' || child.name === 'Or');
    const hasMultipleExpressions =
      children.filter((child) => child.name === 'Filter' || child.name === 'Not' || child.name === '(').length > 1;
    if (hasOperator || hasMultipleExpressions) {
      const filter = this._parseBinaryExpression(cursor, input);
      return { filter };
    }

    // Otherwise, parse the single expression.
    if (!cursor.firstChild()) {
      return { filter: Filter.nothing() };
    }

    const filter = this._parseExpression(cursor, input);
    return { filter };
  }

  /**
   * Parse an assignment node.
   */
  private _parseAssignment(cursor: TreeCursor, input: string): BuildResult {
    if (!cursor.firstChild()) {
      return {};
    }

    let name: string | undefined;
    let filter: Filter.Any | undefined;

    // Find the Assignment node
    do {
      if (cursor.node.name === 'Assignment') {
        // Get the full assignment text first
        const assignmentText = this._getNodeText(cursor, input);

        if (cursor.firstChild()) {
          // First child should be the variable name (Identifier)
          name = this._getNodeText(cursor, input);

          // Find the parentheses in the assignment text and extract the content
          const openParenIndex = assignmentText.indexOf('(');
          const closeParenIndex = assignmentText.lastIndexOf(')');

          if (openParenIndex !== -1 && closeParenIndex !== -1 && closeParenIndex > openParenIndex) {
            const subInput = assignmentText.slice(openParenIndex + 1, closeParenIndex).trim();
            const subTree = this._parser.parse(subInput);
            const subResult = this.buildQuery(subTree, subInput);
            filter = subResult.filter;
          }

          cursor.parent(); // Back to Assignment
        }
        break;
      }
    } while (cursor.nextSibling());

    cursor.parent(); // Back to Query
    return { filter, name };
  }

  /**
   * Parse an expression node.
   */
  private _parseExpression(cursor: TreeCursor, input: string): Filter.Any | undefined {
    const nodeName = cursor.node.name;

    switch (nodeName) {
      case 'Filter':
        return this._parseFilter(cursor, input);

      case 'Not': {
        // Move past NOT token to the expression.
        cursor.nextSibling();
        const notFilter = this._parseExpression(cursor, input);
        return notFilter ? Filter.not(notFilter) : undefined;
      }

      case 'And':
      case 'Or':
        // This is the operator node, we need to handle the binary expression.
        // The cursor is positioned at the operator, we need to go back to parent.
        cursor.parent();
        return this._parseBinaryExpression(cursor, input);

      case '(': {
        // Skip opening paren.
        cursor.nextSibling();
        const parenFilter = this._parseExpression(cursor, input);
        // Skip closing paren.
        cursor.nextSibling();
        return parenFilter;
      }

      default: {
        // Check if this is a binary expression (has And/Or as a child).
        const savedPos = cursor.from;
        if (cursor.firstChild()) {
          // Look for And/Or operators or multiple expressions (implicit AND).
          let hasOperator = false;
          let expressionCount = 0;
          do {
            if (cursor.node.name === 'And' || cursor.node.name === 'Or') {
              hasOperator = true;
              break;
            }
            if (cursor.node.name === 'Filter' || cursor.node.name === 'Not' || cursor.node.name === '(') {
              expressionCount++;
            }
          } while (cursor.nextSibling());
          hasOperator = hasOperator || expressionCount > 1;

          // Reset cursor to the saved position.
          cursor.parent();
          cursor.firstChild();
          while (cursor.from !== savedPos && cursor.nextSibling()) {}

          if (hasOperator) {
            cursor.parent();
            return this._parseBinaryExpression(cursor, input);
          } else {
            const result = this._parseExpression(cursor, input);
            cursor.parent();
            return result;
          }
        }
        return Filter.nothing();
      }
    }
  }

  /**
   * Parse a binary expression (AND/OR).
   */
  private _parseBinaryExpression(cursor: TreeCursor, input: string): Filter.Any {
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
            const subTree = this._parser.parse(subInput);
            const subResult = this.buildQuery(subTree, subInput);
            if (subResult.filter) {
              filters.push(subResult.filter);
            }
          } else {
            // Simple parenthesized expression.
            const subFilter = this._parseExpression(cursor, input);
            if (subFilter) {
              filters.push(subFilter);
            }

            // Skip until we find the closing parenthesis.
            while (cursor.nextSibling() && cursor.node.name !== ')') {}
          }
        } else if (nodeName !== ')') {
          const subFilter = this._parseExpression(cursor, input);
          if (subFilter) {
            filters.push(subFilter);
          }
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
  }

  /**
   * Parse a Filter node.
   */
  private _parseFilter(cursor: TreeCursor, input: string): Filter.Any | undefined {
    if (!cursor.firstChild()) {
      return Filter.nothing();
    }

    let result: Filter.Any | undefined = undefined;
    const filterType = cursor.node.name;
    switch (filterType) {
      case 'TagFilter':
        if (this._tags) {
          result = this._parseTagFilter(cursor, input);
        }
        break;

      case 'TextFilter':
        result = this._parseTextFilter(cursor, input);
        break;

      case 'TypeFilter':
        result = this._parseTypeFilter(cursor, input);
        break;

      case 'ObjectLiteral':
        result = this._parseObjectLiteral(cursor, input);
        break;

      case 'PropertyFilter':
        result = this._parsePropertyFilter(cursor, input);
        break;

      default:
        result = Filter.nothing();
    }

    cursor.parent();
    return result;
  }

  /**
   * Parse a TypeFilter node (type:typename).
   */
  private _parseTypeFilter(cursor: TreeCursor, input: string): Filter.Any {
    // Skip TypeKeyword.
    cursor.firstChild();
    cursor.nextSibling(); // Skip ':'
    cursor.nextSibling(); // Move to Identifier

    const typename = this._getNodeText(cursor, input);
    cursor.parent(); // Go back to TypeFilter.
    return Filter.typename(typename);
  }

  /**
   * Parse a TextFilter node (quoted string).
   */
  private _parseTextFilter(cursor: TreeCursor, input: string): Filter.Any {
    cursor.firstChild(); // Move to String node.
    const text = this._getNodeText(cursor, input);
    cursor.parent(); // Go back to TextFilter.
    // Remove quotes.
    return Filter.text(text.slice(1, -1));
  }

  /**
   * Parse an ObjectLiteral node.
   */
  private _parseObjectLiteral(cursor: TreeCursor, input: string): Filter.Any {
    const props: Record<string, any> = {};

    if (cursor.firstChild()) {
      do {
        if (cursor.node.name === 'ObjectProperty') {
          const { key, value } = this._parseObjectProperty(cursor, input);
          if (key) {
            // Convert simple values to Filter.eq for compatibility with Filter.props.
            props[key] = Filter.eq(value);
          }
        }
      } while (cursor.nextSibling());

      cursor.parent();
    }

    return Filter.props(props);
  }

  /**
   * Parse an ObjectProperty node.
   */
  private _parseObjectProperty(cursor: TreeCursor, input: string): { key: string | null; value: any } {
    let key: string | null = null;
    let value: any = null;

    if (cursor.firstChild()) {
      // First child should be the property name (Identifier).
      if (cursor.node.name === 'Identifier') {
        key = this._getNodeText(cursor, input);
      }

      // Skip ':' and move to Value.
      cursor.nextSibling();
      cursor.nextSibling();

      if (cursor.node.name === 'Value' && cursor.firstChild()) {
        value = this._parseValue(cursor, input);
        cursor.parent();
      }

      cursor.parent();
    }

    return { key, value };
  }

  /**
   * Parse a PropertyFilter node (property:value).
   */
  private _parsePropertyFilter(cursor: TreeCursor, input: string): Filter.Any {
    let path: string | null = null;
    let value: any = null;

    if (cursor.firstChild()) {
      // First child is PropertyPath.
      if (cursor.node.name === 'PropertyPath') {
        path = this._parsePropertyPath(cursor, input);
      }

      // Skip ':' and move to Value.
      cursor.nextSibling();
      cursor.nextSibling();

      if (cursor.node.name === 'Value' && cursor.firstChild()) {
        value = this._parseValue(cursor, input);
        cursor.parent();
      }

      cursor.parent();
    }

    if (!path) {
      return Filter.nothing();
    }

    return Filter.props({ [path]: value });
  }

  /**
   * Parse a PropertyPath node (supports dot notation).
   */
  private _parsePropertyPath(cursor: TreeCursor, input: string): string {
    const parts: string[] = [];

    if (cursor.firstChild()) {
      do {
        if (cursor.node.name === 'Identifier') {
          parts.push(this._getNodeText(cursor, input));
        }
      } while (cursor.nextSibling());

      cursor.parent();
    }

    return parts.join('.');
  }

  /**
   * Parse a TagFilter node (#tag).
   */
  private _parseTagFilter(cursor: TreeCursor, input: string): Filter.Any | undefined {
    invariant(this._tags);
    const str = this._getNodeText(cursor, input).slice(1).toLowerCase();
    const [key] = Object.entries(this._tags!).find(([, value]) => value.label.toLowerCase() === str) ?? [];
    return key ? Filter.tag(key) : undefined;
  }

  /**
   * Parse a Value node.
   */
  private _parseValue(cursor: TreeCursor, input: string): any {
    const valueType = cursor.node.name;

    switch (valueType) {
      case 'String': {
        // Remove quotes.
        const str = this._getNodeText(cursor, input);
        return str.slice(1, -1);
      }

      case 'Number':
        return Number(this._getNodeText(cursor, input));

      case 'Boolean':
        return this._getNodeText(cursor, input) === 'true';

      case 'Null':
        return null;

      case 'ObjectLiteral': {
        // For nested objects, parse recursively.
        const props: Record<string, any> = {};
        if (cursor.firstChild()) {
          do {
            if (cursor.node.name === 'ObjectProperty') {
              const { key, value } = this._parseObjectProperty(cursor, input);
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
              array.push(this._parseValue(cursor, input));
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
  }

  /**
   * Get the text content of the current node.
   */
  private _getNodeText(cursor: TreeCursor, input: string): string {
    return input.slice(cursor.from, cursor.to);
  }
}
