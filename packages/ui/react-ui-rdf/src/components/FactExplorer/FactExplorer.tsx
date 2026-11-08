//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, forwardRef, useCallback, useContext, useMemo, useState } from 'react';

import { type FactAnalytics, RDF } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type FactMatrix, type RankedRow, predicateLabel } from '../../analytics.ts';
import { factualityColor, humanize } from '../../types.ts';
import { FactViewer } from '../FactViewer/index.ts';
import { factExplorerTheme } from './FactExplorer.theme.ts';
import { FACT_CAP, type FactOverview, type FactScope, useFactOverview } from './useFactOverview.ts';

const styles = factExplorerTheme.styles();

//
// An aggregate-first view of a fact set: the counts per predicate, entity, source and factuality, a cross-tab of
// the busiest entities against the predicates they use, and the matching facts beneath. Clicking anything narrows
// the scope, so the fact list is always a drill-down rather than a whole-store read.
//

//
// Context
//

type FactExplorerContextValue = {
  overview: FactOverview;
  ontology: RDF.Ontology.Ontology;
  scope: FactScope;
  /** Narrows or clears one axis of the scope; selecting the current value clears it. */
  toggle: (axis: keyof FactScope, value: string) => void;
  clear: () => void;
};

const FactExplorerContext = createContext<FactExplorerContextValue | null>(null);

const useFactExplorerContext = (consumer: string): FactExplorerContextValue => {
  const context = useContext(FactExplorerContext);
  if (!context) {
    throw new Error(`FactExplorer.${consumer} must be rendered within FactExplorer.Root`);
  }
  return context;
};

//
// Root
//

type FactExplorerRootProps = Util.ThemedClassName<{
  /** The read surface: a store (`FactAnalyticsLive.fromStore`) or a fact array (`…fromFacts`). */
  analytics: FactAnalytics;
  /** The ontology the predicate labels are read from; defaults to the seed vocabulary. */
  ontology?: RDF.Ontology.Ontology;
  /** Scope to start in; the explorer owns it from then on. */
  initialScope?: FactScope;
  /** Bumping this reloads the overview — the store is not reactive, so a writer says when it has written. */
  revision?: number;
  /** Custom composition; when omitted the default toolbar + overview + fact list is rendered. */
  children?: ReactNode;
}>;

/**
 * Aggregate-first explorer over a fact set. The overview is built from counts the store computes in SQL, so it
 * costs the size of its result rather than the size of the corpus; the fact list beneath is capped and reports
 * the true total. Clicking a predicate, an entity or a cross-tab cell narrows the scope.
 */
const FactExplorerRoot = forwardRef<HTMLDivElement, FactExplorerRootProps>(
  ({ classNames, analytics, ontology, initialScope, revision, children }, forwardedRef) => {
    const [scope, setScope] = useState<FactScope>(initialScope ?? {});
    const resolved = useMemo(() => ontology ?? RDF.Ontology.DEFAULT, [ontology]);
    const overview = useFactOverview(analytics, scope, { ontology: resolved, revision });

    const toggle = useCallback(
      (axis: keyof FactScope, value: string) =>
        setScope((current) => ({ ...current, [axis]: current[axis] === value ? undefined : value })),
      [],
    );
    const clear = useCallback(() => setScope({}), []);

    const value = useMemo<FactExplorerContextValue>(
      () => ({ overview, ontology: resolved, scope, toggle, clear }),
      [overview, resolved, scope, toggle, clear],
    );

    return (
      <FactExplorerContext.Provider value={value}>
        <div className={mx(styles.root(), classNames)} ref={forwardedRef}>
          {children ?? (
            <>
              <FactExplorerToolbar />
              <div className={styles.overview()}>
                <FactExplorerDimension axis='predicate' label='Predicates' />
                <FactExplorerDimension axis='entity' label='Entities' />
                <FactExplorerMatrix />
              </div>
              <FactExplorerFacts />
            </>
          )}
        </div>
      </FactExplorerContext.Provider>
    );
  },
);

FactExplorerRoot.displayName = 'FactExplorer.Root';

//
// Toolbar
//

type FactExplorerToolbarProps = Util.ThemedClassName<{}>;

/** The scope as chips, the statements in it, and the factuality mix of those statements. */
const FactExplorerToolbar = ({ classNames }: FactExplorerToolbarProps) => {
  const { overview, ontology, scope, clear } = useFactExplorerContext('Toolbar');
  // A scope value is a join key — an entity slug, a predicate IRI — so each chip shows how it reads. The
  // predicate reads through the ontology rather than the ranking, which an empty scope leaves with no rows.
  const chips = [
    [
      'entity',
      scope.entity && (overview.entities.find((row) => row.key === scope.entity)?.label ?? humanize(scope.entity)),
    ],
    ['predicate', scope.predicate && predicateLabel(scope.predicate, ontology)],
    ['source', scope.source],
  ] as const;
  const scoped = chips.some(([, value]) => value !== undefined);
  return (
    <Panel.Root classNames={classNames}>
      <Toolbar.Root>
        <Toolbar.Text>{scoped ? 'Scope' : 'All facts'}</Toolbar.Text>
        {chips.map(([axis, value]) =>
          value === undefined ? null : (
            <Tag.Tag key={axis} hue='neutral'>
              {value}
            </Tag.Tag>
          ),
        )}
        <div className={styles.toolbarSpacer()} />
        {overview.factuality.map((row) => (
          <Tag.Tag key={row.key} hue={factualityColor(row.key)}>
            {`${row.key} ${row.count}`}
          </Tag.Tag>
        ))}
        <span className={styles.total()}>
          {overview.pending ? 'counting…' : `${overview.total.toLocaleString()} facts`}
        </span>
        <Button.Root icon='ph--x--regular' iconOnly label='Clear scope' disabled={!scoped} onClick={clear} />
      </Toolbar.Root>
    </Panel.Root>
  );
};

FactExplorerToolbar.displayName = 'FactExplorer.Toolbar';

//
// Dimension
//

type FactExplorerDimensionProps = Util.ThemedClassName<{
  /** Which axis of the scope a row sets. */
  axis: keyof FactScope;
  label: string;
}>;

/**
 * A ranked dimension as clickable bar rows. Ranked bars rather than a chart: the labels are entity names and
 * verb phrases, which a categorical axis truncates, and every row has to be selectable and keyboard-reachable.
 */
const FactExplorerDimension = ({ classNames, axis, label }: FactExplorerDimensionProps) => {
  const { overview, scope, toggle } = useFactExplorerContext('Dimension');
  const rows: RankedRow[] =
    axis === 'predicate' ? overview.predicates : axis === 'source' ? overview.sources : overview.entities;
  return (
    <Panel.Root classNames={mx(styles.panel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>{`${label}${rows.length > 0 ? ` (${rows.length})` : ''}`}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames={styles.rankList()}>
            {rows.length === 0 && <Status.Empty>{overview.pending ? 'Loading…' : 'No facts.'}</Status.Empty>}
            {rows.map((row) => (
              <button
                key={row.key}
                type='button'
                aria-pressed={scope[axis] === row.key}
                className={styles.rankRow({ selected: scope[axis] === row.key })}
                onClick={() => toggle(axis, row.key)}
              >
                <span className={styles.rankBar()} style={{ inlineSize: `${Math.round(row.fraction * 100)}%` }} />
                <span className={styles.rankLabel()} title={row.key}>
                  {row.label}
                </span>
                <span className={styles.rankCount()}>{row.count.toLocaleString()}</span>
              </button>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

FactExplorerDimension.displayName = 'FactExplorer.Dimension';

//
// Matrix
//

type FactExplorerMatrixProps = Util.ThemedClassName<{}>;

/** Shading of a cell against the busiest one; an empty cell is left blank rather than shaded at zero. */
const cellOpacity = (count: number, max: number): number => (count === 0 || max === 0 ? 0 : 0.1 + (count / max) * 0.5);

/**
 * The busiest entities against the predicates they use. A cross-tab rather than a node-link graph: it is dense,
 * every cell is clickable, and it stays the size of the screen however many facts the store holds.
 */
const FactExplorerMatrix = ({ classNames }: FactExplorerMatrixProps) => {
  const { overview, scope, toggle } = useFactExplorerContext('Matrix');
  const matrix: FactMatrix = overview.matrix;
  const template = `minmax(6rem, 10rem) repeat(${matrix.columns.length}, minmax(2.5rem, 1fr))`;
  const select = (entity: string, predicate: string) => {
    toggle('entity', entity);
    if (scope.predicate !== predicate) {
      toggle('predicate', predicate);
    }
  };

  return (
    <Panel.Root classNames={mx('md:col-span-2', styles.panel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>Entities × predicates</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames={styles.matrix()}>
        {matrix.rows.length === 0 || matrix.columns.length === 0 ? (
          <Status.Empty icon='ph--grid-four--regular'>
            {overview.pending ? 'Loading…' : 'No facts to cross-tabulate.'}
          </Status.Empty>
        ) : (
          <div className={styles.matrixGrid()} style={{ gridTemplateColumns: template }} role='table'>
            <div className={styles.matrixCorner()} />
            {matrix.columns.map((column) => (
              <div key={column.key} className={styles.matrixColumnHeader()} title={column.key}>
                {column.label}
              </div>
            ))}
            {matrix.rows.map((row) => (
              <React.Fragment key={row.key}>
                <div className={styles.matrixRowHeader()} title={row.key}>
                  {row.label}
                </div>
                {matrix.columns.map((column) => {
                  const count = matrix.cell(row.key, column.key);
                  const selected = scope.entity === row.key && scope.predicate === column.key;
                  return (
                    <button
                      key={column.key}
                      type='button'
                      aria-label={`${row.label} ${column.label}: ${count}`}
                      className={styles.matrixCell({ selected })}
                      // An empty cell has nothing to narrow to; selecting it would scope the view to zero facts.
                      disabled={count === 0}
                      onClick={() => select(row.key, column.key)}
                    >
                      <span className={styles.matrixCellFill()} style={{ opacity: cellOpacity(count, matrix.max) }} />
                      <span className={styles.matrixCellValue()}>{count === 0 ? '' : count}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

FactExplorerMatrix.displayName = 'FactExplorer.Matrix';

//
// Facts
//

type FactExplorerFactsProps = Util.ThemedClassName<{}>;

/** The facts in scope, through the existing {@link FactViewer}; capped, with the true total stated. */
const FactExplorerFacts = ({ classNames }: FactExplorerFactsProps) => {
  const { overview, scope } = useFactExplorerContext('Facts');
  const capped = overview.total > overview.facts.length;
  return (
    <FactViewer.Root classNames={classNames} facts={overview.facts} context={scope.entity}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>
            {capped
              ? `Facts (showing ${overview.facts.length.toLocaleString()} of ${overview.total.toLocaleString()}; narrow the scope to see the rest)`
              : `Facts (${overview.facts.length.toLocaleString()})`}
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <FactViewer.List />
    </FactViewer.Root>
  );
};

FactExplorerFacts.displayName = 'FactExplorer.Facts';

//
// FactExplorer
//

export const FactExplorer = {
  Root: FactExplorerRoot,
  Toolbar: FactExplorerToolbar,
  Dimension: FactExplorerDimension,
  Matrix: FactExplorerMatrix,
  Facts: FactExplorerFacts,
};

export { FACT_CAP, type FactScope, useFactOverview };
export type { FactOverview };
export type {
  FactExplorerDimensionProps,
  FactExplorerFactsProps,
  FactExplorerMatrixProps,
  FactExplorerRootProps,
  FactExplorerToolbarProps,
};
