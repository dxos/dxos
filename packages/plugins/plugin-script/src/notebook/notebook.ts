//
// Copyright 2025 DXOS.org
//

import { type Notebook } from '../types';

import { type ParsedExpression, VirtualTypeScriptParser } from './vfs-parser';

/**
 * Evaluate the script.
 */
const evalScript = (code: string, deps: Record<string, any> = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...Object.keys(deps), 'return ' + code)(...Object.values(deps));
};

/**
 * Compute graph that evaluates the notebook cells.
 */
export class ComputeGraph {
  private readonly _parser = new VirtualTypeScriptParser();
  private _values: Record<string, any> = {};

  constructor(private readonly _notebook: Notebook.Notebook) {}

  get values() {
    return this._values;
  }

  evaluate() {
    const { expressions, dependencyGraph } = this.parse();

    // Create a map of cell IDs to expressions for easy lookup.
    const cellExpressions = new Map<string, ParsedExpression & { cellId: string }>();
    expressions.forEach((expr) => {
      cellExpressions.set(expr.cellId, expr);
    });

    // Topological sort to determine evaluation order.
    const evaluationOrder = this.topologicalSort(
      expressions.map((e) => e.cellId),
      dependencyGraph,
    );

    // Clear previous values
    this._values = {};

    // Evaluate cells in dependency order
    for (const cellId of evaluationOrder) {
      const expr = cellExpressions.get(cellId);
      if (!expr) continue;

      const cellSource = this._notebook.cells.find((cell) => cell.id === cellId)?.source.target?.content;
      if (!cellSource) continue;

      try {
        // For assignments or declarations, evaluate and store the value
        if (expr.name) {
          // Handle both 'const x = ...' and 'x = ...' patterns
          let rhs: string;
          if (cellSource.startsWith('const ') || cellSource.startsWith('let ') || cellSource.startsWith('var ')) {
            // Extract RHS from declaration
            const match = cellSource.match(/(?:const|let|var)\s+\w+\s*=\s*(.+)/);
            if (match) {
              rhs = match[1].trim();
            } else {
              continue;
            }
          } else if (cellSource.includes('=')) {
            // Simple assignment
            [, rhs] = cellSource.split('=').map((s) => s.trim());
          } else {
            continue;
          }

          const result = evalScript(rhs, this._values);
          this._values[expr.name] = result;
        } else {
          // For expressions without assignment, just evaluate.
          evalScript(cellSource, this._values);
        }
      } catch (error) {
        console.error(`Error evaluating cell ${cellId}:`, error);
      }
    }

    return this._values;
  }

  parse() {
    const expressions = this._notebook.cells
      .map((cell) => {
        const text = cell.source.target;
        if (text) {
          const { content } = text;
          const parsed = this._parser.parseExpression(content);
          return { cellId: cell.id, ...parsed };
        }
      })
      .filter(Boolean) as (ParsedExpression & { cellId: string })[];

    // Build dependency graph.
    const dependencyGraph = this.buildDependencyGraph(expressions);
    return { expressions, dependencyGraph };
  }

  private topologicalSort(nodes: string[], dependencies: Record<string, string[]>): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
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

  private buildDependencyGraph(expressions: (ParsedExpression & { cellId: string })[]) {
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
}
