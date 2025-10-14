//
// Copyright 2025 DXOS.org
//

import { type Signal, signal } from '@preact/signals-core';

import { log } from '@dxos/log';

import { type Notebook } from '../types';

import { evalScript } from './eval';
import { type ParsedExpression, VirtualTypeScriptParser } from './vfs-parser';

/**
 * Compute graph that evaluates the notebook cells.
 */
export class ComputeGraph {
  private readonly _parser = new VirtualTypeScriptParser();

  private _expressions = signal<Record<string, ParsedExpression>>({});
  private _values = signal<Record<string, any>>({});

  constructor(private readonly _notebook: Notebook.Notebook) {}

  /**
   * Parsed expressions by cell ID.
   */
  get expressions(): Signal<Record<string, ParsedExpression>> {
    return this._expressions;
  }

  /**
   * Computed values by cell ID.
   */
  get values(): Signal<Record<string, any>> {
    return this._values;
  }

  /**
   * Compute values.
   */
  evaluate() {
    // Parse expressions.
    const { expressions, dependencyGraph } = this.parse();
    this._values.value = {};

    // Create a map of cell IDs to expressions for easy lookup.
    const cellExpressions = new Map<string, ParsedExpression>();
    Object.entries(expressions).forEach(([id, expr]) => {
      cellExpressions.set(id, expr);
    });

    // Topological sort to determine evaluation order.
    const evaluationOrder = this.topologicalSort(Object.keys(expressions), dependencyGraph);

    // Values by reference name.
    const valuesByName: Record<string, any> = {};
    const valuesByCellId: Record<string, any> = {};

    // Evaluate cells in dependency order.
    for (const cellId of evaluationOrder) {
      const expr = cellExpressions.get(cellId);
      if (!expr) {
        log.error('no expression for cell', { cellId });
        continue;
      }

      const cellSource = this._notebook.cells.find((cell) => cell.id === cellId)?.script.target?.content;
      if (!cellSource) {
        log.error('no source for cell', { cellId });
        continue;
      }

      try {
        // For assignments or declarations, evaluate and store the value.
        if (expr.name && expr.value !== undefined) {
          // If the parser extracted a literal value, use it directly.
          valuesByName[expr.name] = expr.value;
          valuesByCellId[cellId] = expr.value;
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

            const result = evalScript(rhs, valuesByName);
            valuesByName[expr.name] = result;
            if (typeof result !== 'function') {
              valuesByCellId[cellId] = result;
            }
          }
        } else {
          // For expressions without assignment, just evaluate.
          const result = evalScript(cellSource, valuesByName);
          valuesByCellId[cellId] = result;
        }
      } catch (error) {
        log.error('error evaluating cell', { cellId, error });
      }
    }

    this._values.value = valuesByCellId;
    return valuesByCellId;
  }

  /**
   * Parse expressions.
   */
  parse() {
    const expressions = this._notebook.cells.reduce<Record<string, ParsedExpression>>((acc, cell) => {
      const text = cell.script.target?.content.trim();
      if (text) {
        const parsed = this._parser.parseExpression(text);
        acc[cell.id] = parsed;
      }

      return acc;
    }, {});

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

  private buildDependencyGraph(expressions: Record<string, ParsedExpression>): Record<string, string[]> {
    // Create a map of variable names to their cell IDs.
    const nameToCellId = new Map<string, string>();
    Object.entries(expressions).forEach(([id, expr]) => {
      if (expr.name) {
        nameToCellId.set(expr.name, id);
      }
    });

    // Build the dependency graph using cell IDs.
    const graph: Record<string, string[]> = {};
    Object.entries(expressions).forEach(([id, expr]) => {
      if (expr.references && expr.references.length > 0) {
        // Map variable references to cell IDs.
        const dependencyCellIds = expr.references
          .map((ref) => nameToCellId.get(ref))
          .filter((cellId): cellId is string => cellId !== undefined && cellId !== id);

        if (dependencyCellIds.length > 0) {
          graph[id] = dependencyCellIds;
        }
      }
    });

    return graph;
  }
}
