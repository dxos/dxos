//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { type Notebook } from '../types';

import { type ParsedExpression, VirtualTypeScriptParser } from './vfs-parser';

/**
 * Compute graph that evaluates the notebook cells.
 */
export class ComputeGraph {
  private readonly _parser = new VirtualTypeScriptParser();

  /** Values by name. */
  private _values: Record<string, any> = {};

  constructor(private readonly _notebook: Notebook.Notebook) {}

  get values() {
    return this._values;
  }

  evaluate() {
    // Clear previous values.
    this._values = {};

    const { expressions, dependencyGraph } = this.parse();

    // Create a map of cell IDs to expressions for easy lookup.
    const cellExpressions = new Map<string, ParsedExpression & { cellId: string }>();
    expressions.forEach((expr) => {
      cellExpressions.set(expr.cellId, expr);
    });

    // Topological sort to determine evaluation order.
    const evaluationOrder = this.topologicalSort(
      expressions.map((expr) => expr.cellId),
      dependencyGraph,
    );

    // Evaluate cells in dependency order.
    for (const cellId of evaluationOrder) {
      const expr = cellExpressions.get(cellId);
      if (!expr) {
        log.error('no expression for cell', { cellId });
        continue;
      }

      const cellSource = this._notebook.cells.find((cell) => cell.id === cellId)?.source.target?.content;
      if (!cellSource) {
        log.error('no source for cell', { cellId });
        continue;
      }

      try {
        // For assignments or declarations, evaluate and store the value.
        if (expr.name && expr.value !== undefined) {
          // If the parser extracted a literal value, use it directly.
          this._values[expr.name] = expr.value;
        } else if (expr.name) {
          // For non-literal assignments, we need to evaluate the expression.
          // The parser identifies it's an assignment, so we can extract the RHS.
          const equalIndex = cellSource.indexOf('=');
          if (equalIndex !== -1) {
            // Find the actual assignment operator (not in strings or other contexts).
            let rhs = cellSource.substring(equalIndex + 1).trim();

            // Handle semicolon at the end.
            if (rhs.endsWith(';')) {
              rhs = rhs.slice(0, -1).trim();
            }

            const result = this.evalScript(rhs, this._values);
            this._values[expr.name] = result;
          }
        } else {
          // For expressions without assignment, just evaluate.
          this.evalScript(cellSource, this._values);
        }
      } catch (error) {
        log.error('error evaluating cell', { cellId, error });
      }
    }

    return this._values;
  }

  parse() {
    const expressions = this._notebook.cells
      .map((cell) => {
        const text = cell.source.target;
        if (text) {
          const parsed = this._parser.parseExpression(text.content);
          return { cellId: cell.id, ...parsed };
        }
      })
      .filter(isNonNullable);

    // Build dependency graph.
    const dependencyGraph = this.buildDependencyGraph(expressions);
    return { expressions, dependencyGraph };
  }

  private topologicalSort(nodes: string[], dependencies: Record<string, string[]>): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) {
        return;
      }

      visited.add(node);

      // Visit dependencies first.
      const deps = dependencies[node] || [];
      deps.forEach((dep) => visit(dep));
      result.push(node);
    };

    // Visit all nodes.
    nodes.forEach((node) => visit(node));
    return result;
  }

  private buildDependencyGraph(expressions: (ParsedExpression & { cellId: string })[]): Record<string, string[]> {
    // Create a map of variable names to their cell IDs.
    const nameToCell = new Map<string, string>();
    expressions.forEach((expr) => {
      if (expr.name) {
        nameToCell.set(expr.name, expr.cellId);
      }
    });

    // Build the dependency graph using cell IDs.
    const graph: Record<string, string[]> = {};
    expressions.forEach((expr) => {
      if (expr.references && expr.references.length > 0) {
        // Map variable references to cell IDs.
        const dependencyCellIds = expr.references
          .map((ref) => nameToCell.get(ref))
          .filter((cellId): cellId is string => cellId !== undefined && cellId !== expr.cellId);

        if (dependencyCellIds.length > 0) {
          graph[expr.cellId] = dependencyCellIds;
        }
      }
    });

    return graph;
  }

  /**
   * Evaluate the script (with dependencies as arguments).
   */
  private evalScript(code: string, deps: Record<string, any> = {}) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...Object.keys(deps), 'return ' + code)(...Object.values(deps));
  }
}
