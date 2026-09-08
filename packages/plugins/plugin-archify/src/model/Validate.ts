//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as SchemaIssue from 'effect/SchemaIssue';

import * as Ir from './Ir';
import * as Layout from './Layout';

/**
 * Archify's contract is that a diagram is checked before it is shown, and that a rejection is a
 * repair instruction rather than an opinion: every diagnostic names a rule `code`, the `subject`
 * it is about, the `evidence` that produced it, and the `supportedFixes` — the IR fields the
 * author may change to clear it. The agent loop depends on that: it edits the named field and
 * re-validates, instead of guessing.
 */
export type Diagnostic = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  subject: Record<string, string | number>;
  evidence: Record<string, unknown>;
  supportedFixes: readonly string[];
};

export type ValidationResult = {
  ok: boolean;
  diagnostics: readonly Diagnostic[];
  /** The decoded document, present whenever the source parsed — callers store this, not the input. */
  document?: Ir.Architecture;
};

/** Effect 4's standard-schema formatter flattens the issue tree into `{ message, path }`. */
const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1();

const formatPath = (path: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined): string =>
  (path ?? [])
    .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
    .map((segment) => (/^\d+$/.test(segment) ? `[${segment}]` : segment))
    .join('.') || 'architecture';

const rect = (component: Layout.ComponentRect) => ({
  x: Math.round(component.x),
  y: Math.round(component.y),
  width: Math.round(component.width),
  height: Math.round(component.height),
});

/** Archify's boxes need air between them to read as separate; this is the enforced minimum. */
const MIN_COMPONENT_GAP = 30;

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box, gap = 0): boolean =>
  a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

/** Whether a segment enters a rect, used for both route clearance and label clearance. */
const segmentHitsRect = (
  [x1, y1]: Ir.Point,
  [x2, y2]: Ir.Point,
  box: { x: number; y: number; width: number; height: number },
): boolean => {
  const steps = 32;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height) {
      return true;
    }
  }
  return false;
};

/** Rough text box for an edge label; SVG has no measurement outside a document. */
const labelBox = ([x, y]: Ir.Point, text: string) => {
  const width = text.length * 5.4 + 10;
  return { x: x - width / 2, y: y - 12, width, height: 16 };
};

const structural = (diagram: Ir.Architecture): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  for (const component of diagram.components) {
    if (seen.has(component.id)) {
      diagnostics.push({
        code: 'id/duplicate',
        severity: 'error',
        message: `Two components share the id "${component.id}"; connections and views cannot address either one.`,
        subject: { component: component.id },
        evidence: { id: component.id },
        supportedFixes: ['components[].id'],
      });
    }
    seen.add(component.id);
  }

  const grid = diagram.layout?.mode === 'grid';
  const cells = new Map<string, string>();
  for (const component of diagram.components) {
    const placed = !!component.pos || (grid && Number.isInteger(component.row) && Number.isInteger(component.col));
    if (!placed) {
      diagnostics.push({
        code: 'layout/unplaced',
        severity: 'error',
        message: `Component "${component.id}" has no position: give it pos [x, y], or row/col under layout.mode "grid".`,
        subject: { component: component.id },
        evidence: { hasLayout: grid },
        supportedFixes: ['components[].pos', 'components[].row', 'components[].col', 'layout'],
      });
      continue;
    }
    if (!grid || component.pos) {
      continue;
    }
    const cols = diagram.layout?.cols ?? 4;
    if ((component.col ?? 0) >= cols) {
      diagnostics.push({
        code: 'layout/grid-overflow',
        severity: 'error',
        message: `Component "${component.id}" sits in col ${component.col}, outside layout.cols ${cols} (valid: 0..${cols - 1}).`,
        subject: { component: component.id },
        evidence: { col: component.col ?? 0, cols },
        supportedFixes: ['components[].col', 'layout.cols'],
      });
    }
    const key = `${component.row},${component.col}`;
    const occupant = cells.get(key);
    if (occupant) {
      diagnostics.push({
        code: 'layout/grid-collision',
        severity: 'error',
        message: `Components "${occupant}" and "${component.id}" both claim grid cell row ${component.row} col ${component.col}.`,
        subject: { component: component.id, other: occupant },
        evidence: { row: component.row ?? 0, col: component.col ?? 0 },
        supportedFixes: ['components[].row', 'components[].col'],
      });
    } else {
      cells.set(key, component.id);
    }
  }

  for (const [index, connection] of (diagram.connections ?? []).entries()) {
    for (const [end, id] of [
      ['from', connection.from],
      ['to', connection.to],
    ] as const) {
      if (!seen.has(id)) {
        diagnostics.push({
          code: 'connection/unknown-endpoint',
          severity: 'error',
          message: `Connection ${connection.id ?? `#${index}`} points at "${id}", which is not a component id.`,
          subject: { connection: connection.id ?? `#${index}`, end },
          evidence: { id, known: [...seen] },
          supportedFixes: [`connections[].${end}`, 'components[].id'],
        });
      }
    }
    if (connection.from === connection.to) {
      diagnostics.push({
        code: 'connection/self',
        severity: 'error',
        message: `Connection ${connection.id ?? `#${index}`} starts and ends at "${connection.from}".`,
        subject: { connection: connection.id ?? `#${index}` },
        evidence: { id: connection.from },
        supportedFixes: ['connections[].from', 'connections[].to'],
      });
    }
  }

  for (const boundary of diagram.boundaries ?? []) {
    const unknown = boundary.wraps.filter((id) => !seen.has(id));
    if (unknown.length) {
      diagnostics.push({
        code: 'boundary/unknown-member',
        severity: 'error',
        message: `Boundary "${boundary.label}" wraps ${unknown.map((id) => `"${id}"`).join(', ')}, which are not components.`,
        subject: { boundary: boundary.label },
        evidence: { unknown },
        supportedFixes: ['boundaries[].wraps'],
      });
    }
  }

  for (const view of diagram.meta.views ?? []) {
    const unknown = view.focus.filter((id) => !seen.has(id));
    if (unknown.length) {
      diagnostics.push({
        code: 'view/unknown-focus',
        severity: 'error',
        message: `Guided view "${view.id}" focuses ${unknown.map((id) => `"${id}"`).join(', ')}, which are not components.`,
        subject: { view: view.id },
        evidence: { unknown },
        supportedFixes: ['meta.views[].focus'],
      });
    }
  }

  return diagnostics;
};

/** Rules that need resolved geometry: overlaps, route clearance, label clearance. */
const geometric = (diagram: Ir.Architecture, resolved: Layout.ResolvedDiagram): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const placed = resolved.components.filter((component) => Number.isFinite(component.x));

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (overlaps(placed[i], placed[j], MIN_COMPONENT_GAP)) {
        diagnostics.push({
          code: 'layout/component-overlap',
          severity: 'error',
          message: `Components "${placed[i].id}" and "${placed[j].id}" are less than ${MIN_COMPONENT_GAP}px apart; move one at least ${MIN_COMPONENT_GAP}px clear.`,
          subject: { component: placed[i].id, other: placed[j].id },
          evidence: { a: rect(placed[i]), b: rect(placed[j]) },
          supportedFixes: ['components[].pos', 'components[].size'],
        });
      }
    }
  }

  for (const { key, connection, points, label } of resolved.connections) {
    for (const component of placed) {
      if (component.id === connection.from || component.id === connection.to) {
        continue;
      }
      const hit = points.slice(0, -1).some((point, index) => segmentHitsRect(point, points[index + 1], component));
      if (hit) {
        diagnostics.push({
          code: 'route/crosses-component',
          severity: 'error',
          message: `Connection ${key} runs through component "${component.id}"; route it around with via waypoints or different endpoint sides.`,
          subject: { connection: key, component: component.id },
          evidence: { component: rect(component), points },
          supportedFixes: [
            'connections[].via',
            'connections[].fromSide',
            'connections[].toSide',
            'connections[].route',
          ],
        });
        break;
      }
    }

    if (label) {
      const box = labelBox(label.at, label.text);
      // The whole label rect, not just its top edge: a component under the lower half hides it too.
      const blocker = placed.find((component) => overlaps(box, component));
      if (blocker) {
        const below = Math.round(blocker.y + blocker.height + 14);
        diagnostics.push({
          code: 'label/clearance',
          severity: 'warning',
          message: `Label "${label.text}" on ${key} sits over component "${blocker.id}"; nudge it with labelDy ${below - Math.round(label.at[1])} or pin it with labelAt.`,
          subject: { connection: key, component: blocker.id },
          evidence: { label: box, component: rect(blocker) },
          supportedFixes: ['connections[].labelAt', 'connections[].labelDx', 'connections[].labelDy'],
        });
      }
    }
  }

  const orphans = new Set(diagram.components.map((component: Ir.Component) => component.id));
  for (const connection of diagram.connections ?? []) {
    orphans.delete(connection.from);
    orphans.delete(connection.to);
  }
  if (diagram.components.length > 1 && orphans.size) {
    diagnostics.push({
      code: 'graph/orphan',
      severity: 'warning',
      message: `${[...orphans].map((id) => `"${id}"`).join(', ')} have no connections; a reader cannot tell how they participate.`,
      subject: { components: [...orphans].join(', ') },
      evidence: { orphans: [...orphans] },
      supportedFixes: ['connections', 'components'],
    });
  }

  return diagnostics;
};

/**
 * Validates unknown input end to end: schema first (a shape error makes every geometric rule
 * meaningless), then structure, then geometry.
 */
export const validate = (source: unknown): ValidationResult => {
  const decoded = Schema.decodeUnknownResult(Ir.Architecture)(source, { errors: 'all' });
  if (Result.isFailure(decoded)) {
    return {
      ok: false,
      diagnostics: formatIssue(decoded.failure.issue).issues.map(({ message, path }) => ({
        code: 'schema/invalid',
        severity: 'error' as const,
        message,
        subject: { path: formatPath(path) },
        evidence: {},
        supportedFixes: [formatPath(path)],
      })),
    };
  }

  const diagram = decoded.success;
  const diagnostics = structural(diagram);
  // Geometry is only meaningful once every component resolves to a rect.
  const blocking = diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error' && diagnostic.code.startsWith('layout/'),
  );
  const all = blocking ? diagnostics : [...diagnostics, ...geometric(diagram, Layout.resolve(diagram))];
  return { ok: !all.some((diagnostic) => diagnostic.severity === 'error'), diagnostics: all, document: diagram };
};
