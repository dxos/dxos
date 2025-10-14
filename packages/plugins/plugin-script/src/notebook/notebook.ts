//
// Copyright 2025 DXOS.org
//

import { type Signal, signal } from '@preact/signals-core';

import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { type Notebook } from '../types';

import { type ParsedExpression, VirtualTypeScriptParser } from './vfs-parser';

export type CellExpression = { id: string } & ParsedExpression;

/**
 * Compute graph that evaluates the notebook cells.
 */
export class ComputeGraph {
  private readonly _parser = new VirtualTypeScriptParser();

  /**
   * Parsed expressions.
   */
  private _expressions = signal<CellExpression[]>([]);

  /**
   * Computed values by cell ID.
   */
  private _values = signal<Record<string, any>>({});

  constructor(private readonly _notebook: Notebook.Notebook) {}

  get values(): Signal<Record<string, any>> {
    return this._values;
  }

  get expressions(): Signal<CellExpression[]> {
    return this._expressions;
  }

  evaluate() {
    // Parse expressions.
    const { expressions, dependencyGraph } = this.parse();
    this._values.value = {};

    // Create a map of cell IDs to expressions for easy lookup.
    const cellExpressions = new Map<string, CellExpression>();
    expressions.forEach((expr) => {
      cellExpressions.set(expr.id, expr);
    });

    // Topological sort to determine evaluation order.
    const evaluationOrder = this.topologicalSort(
      expressions.map((expr) => expr.id),
      dependencyGraph,
    );

    // Evaluate cells in dependency order.
    const values: Record<string, any> = {};
    for (const cellId of evaluationOrder) {
      const expr = cellExpressions.get(cellId);
      if (!expr) {
        log.error('no expression for cell', { cellId });
        continue;
      }

      const cellSource = this._notebook.cells.find((cell) => cell.id === cellId)?.script.target?.source.target?.content;
      if (!cellSource) {
        log.error('no source for cell', { cellId });
        continue;
      }

      try {
        // For assignments or declarations, evaluate and store the value.
        if (expr.name && expr.value !== undefined) {
          // If the parser extracted a literal value, use it directly.
          values[expr.name] = expr.value;
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

            const result = this.evalScript(rhs, values);
            values[expr.name] = result;
          }
        } else {
          // For expressions without assignment, just evaluate.
          this.evalScript(cellSource, values);
        }
      } catch (error) {
        log.error('error evaluating cell', { cellId, error });
      }
    }

    this._values.value = values;
    return values;
  }

  parse() {
    const expressions = this._notebook.cells
      .map<CellExpression | undefined>((cell) => {
        const text = cell.script.target?.source.target;
        if (text) {
          const parsed = this._parser.parseExpression(text.content);
          return { id: cell.id, ...parsed } satisfies CellExpression;
        }
      })
      .filter(isNonNullable);

    // Build dependency graph.
    const dependencyGraph = this.buildDependencyGraph(expressions);
    this._expressions.value = expressions;
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

  private buildDependencyGraph(expressions: CellExpression[]): Record<string, string[]> {
    // Create a map of variable names to their cell IDs.
    const nameToCellId = new Map<string, string>();
    expressions.forEach((expr) => {
      if (expr.name) {
        nameToCellId.set(expr.name, expr.id);
      }
    });

    // Build the dependency graph using cell IDs.
    const graph: Record<string, string[]> = {};
    expressions.forEach((expr) => {
      if (expr.references && expr.references.length > 0) {
        // Map variable references to cell IDs.
        const dependencyCellIds = expr.references
          .map((ref) => nameToCellId.get(ref))
          .filter((cellId): cellId is string => cellId !== undefined && cellId !== expr.id);

        if (dependencyCellIds.length > 0) {
          graph[expr.id] = dependencyCellIds;
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
