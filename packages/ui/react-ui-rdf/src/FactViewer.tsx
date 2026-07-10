//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, forwardRef, useContext, useMemo, useState } from 'react';

import { type RDF, buildFactGraph, factSourceFromFacts } from '@dxos/pipeline-rdf';
import { Icon, IconButton, Input, Panel, ScrollArea, Tag, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-graph';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { factViewerTheme } from './FactViewer.theme';
import { type Group, factualityColor, formatDate, formatTerm, graphToTreeNode, groupFacts, termKey } from './types';

const styles = factViewerTheme.styles();

type View = 'list' | 'graph';

//
// Context
//

type FactViewerContextValue = {
  facts: RDF.Fact[];
  context?: string;
  predicate?: string;
  groups: Group[];
  graph: ReturnType<typeof graphToTreeNode> | undefined;
  filter: string;
  setFilter: (value: string) => void;
  view: View;
  setView: (view: View) => void;
};

const FactViewerContext = createContext<FactViewerContextValue | null>(null);

const useFactViewerContext = (consumer: string): FactViewerContextValue => {
  const context = useContext(FactViewerContext);
  if (!context) {
    throw new Error(`FactViewer.${consumer} must be rendered within FactViewer.Root`);
  }
  return context;
};

//
// Root
//

type FactViewerRootProps = ThemedClassName<{
  facts: RDF.Fact[];
  /** Context entity id; scopes the list and roots the graph. */
  context?: string;
  /** Predicate filter; when set, only facts with this predicate are shown. */
  predicate?: string;
  /** Custom composition; when omitted the default toolbar + list/graph body is rendered. */
  children?: ReactNode;
}>;

/**
 * Viewer for extracted semantic facts with two views: a grouped **list** (by subject entity, with
 * conflicts highlighted) and a **graph** (tidy tree rooted at the context entity). A `context` entity
 * scopes the list and roots the graph; a `predicate` further filters the list. Pure/presentational.
 *
 * Renders a default toolbar + body when given no children; pass children to compose the parts
 * (`FactViewer.Toolbar`, `FactViewer.List`, `FactViewer.Graph`) directly.
 */
const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(
  ({ classNames, facts, context, predicate, children }, forwardedRef) => {
    const [filter, setFilter] = useState('');
    const [view, setView] = useState<View>('list');
    const scoped = useMemo(
      () =>
        facts.filter(
          (fact) =>
            (context == null ||
              termKey(fact.assertion.subject) === context ||
              termKey(fact.assertion.object) === context) &&
            (predicate == null || fact.assertion.predicate === predicate),
        ),
      [facts, context, predicate],
    );
    const groups = useMemo(() => groupFacts(scoped, filter), [scoped, filter]);
    const graph = useMemo(
      () =>
        context == null ? undefined : graphToTreeNode(buildFactGraph(context, factSourceFromFacts(facts)), context),
      [facts, context],
    );

    const value = useMemo<FactViewerContextValue>(
      () => ({ facts, context, predicate, groups, graph, filter, setFilter, view, setView }),
      [facts, context, predicate, groups, graph, filter, view],
    );

    return (
      <FactViewerContext.Provider value={value}>
        <Panel.Root classNames={classNames} ref={forwardedRef}>
          {children ?? (
            <>
              <FactViewerToolbar />
              {view === 'list' ? <FactViewerList /> : <FactViewerGraph />}
            </>
          )}
        </Panel.Root>
      </FactViewerContext.Provider>
    );
  },
);

FactViewerRoot.displayName = 'FactViewer.Root';

//
// Toolbar
//

type FactViewerToolbarProps = ThemedClassName<{}>;

const FactViewerToolbar = ({ classNames }: FactViewerToolbarProps) => {
  const { filter, setFilter, view, setView } = useFactViewerContext('Toolbar');
  return (
    <Panel.Toolbar asChild>
      <Toolbar.Root classNames={classNames}>
        <Input.Root>
          <Input.Label srOnly>Filter facts</Input.Label>
          <Input.TextInput
            placeholder='Filter by entity or predicate…'
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Input.Root>
        <div role='none' className={styles.toolbarSpacer()} />
        <IconButton
          icon='ph--list--regular'
          iconOnly
          label='List view'
          variant={view === 'list' ? 'primary' : 'default'}
          onClick={() => setView('list')}
        />
        <IconButton
          icon='ph--graph--regular'
          iconOnly
          label='Graph view'
          variant={view === 'graph' ? 'primary' : 'default'}
          onClick={() => setView('graph')}
        />
      </Toolbar.Root>
    </Panel.Toolbar>
  );
};

FactViewerToolbar.displayName = 'FactViewer.Toolbar';

//
// List
//

type FactViewerListProps = ThemedClassName<{}>;

const FactViewerList = ({ classNames }: FactViewerListProps) => {
  const { groups } = useFactViewerContext('List');
  return (
    <Panel.Content asChild>
      <ScrollArea.Root padding classNames={classNames}>
        <ScrollArea.Viewport classNames={styles.listViewport()}>
          {groups.length === 0 && <Empty label='No facts.' />}
          {groups.map((group) => (
            <FactViewerGroup key={group.subject} group={group} />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  );
};

FactViewerList.displayName = 'FactViewer.List';

//
// Graph
//

type FactViewerGraphProps = ThemedClassName<{}>;

const FactViewerGraph = ({ classNames }: FactViewerGraphProps) => {
  const { graph } = useFactViewerContext('Graph');
  return (
    <Panel.Content classNames={mx(styles.graphContent(), classNames)}>
      {graph ? (
        <Tree data={graph} variant='tidy' margin={80} classNames={styles.graphTree()} />
      ) : (
        <Empty icon='ph--graph--regular' label='Select an entity to root the graph.' />
      )}
    </Panel.Content>
  );
};

FactViewerGraph.displayName = 'FactViewer.Graph';

//
// Group
//

type FactViewerGroupProps = ThemedClassName<{ group: Group }>;

const FactViewerGroup = forwardRef<HTMLDivElement, FactViewerGroupProps>(({ classNames, group }, forwardedRef) => (
  <div className={styles.group({ class: mx(classNames) })} ref={forwardedRef}>
    <div className={styles.groupHeader()}>
      <h3>{group.subject}</h3>
      {group.conflicted && (
        <Tag hue='warning'>
          <span className={styles.groupConflict()}>
            <Icon icon='ph--warning--regular' size={3} />
            conflict
          </span>
        </Tag>
      )}
    </div>
    <Listbox.Root>
      <Listbox.Content aria-label={group.subject}>
        {group.facts.map((fact) => (
          <FactViewerRow key={fact.id} fact={fact} conflicting={group.conflictedIds.has(fact.id)} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  </div>
));

FactViewerGroup.displayName = 'FactViewer.Group';

//
// Row
//

type FactViewerRowProps = ThemedClassName<{ fact: RDF.Fact; conflicting?: boolean }>;

const FactViewerRow = forwardRef<HTMLLIElement, FactViewerRowProps>(
  ({ classNames, fact, conflicting }, forwardedRef) => {
    const { assertion, factuality, attribution } = fact;
    return (
      <Listbox.Item id={fact.id} classNames={styles.row({ conflicting, class: mx(classNames) })} ref={forwardedRef}>
        {assertion.quote && <div className={styles.rowQuote()}>"{assertion.quote}"</div>}

        <div className={styles.rowGrid()}>
          <div className={styles.rowTriple()}>
            <span className={styles.cell({ class: 'text-right' })}>{formatTerm(assertion.subject)}</span>
            <span className={styles.cellDivider()} />
            <span className={styles.cell({ class: 'text-center text-description' })}>{assertion.predicate}</span>
            <span className={styles.cellDivider()} />
            <span className={styles.cell()}>{formatTerm(assertion.object)}</span>
          </div>

          <div className={styles.rowMeta()}>
            {factuality.confidence != null && (
              <span className={styles.rowConfidence()}>{Math.round(factuality.confidence * 100)}%</span>
            )}
            <Tag hue={factualityColor(factuality.value)}>{factuality.value}</Tag>
          </div>
        </div>

        <div className={styles.rowAttribution()}>
          {[attribution.agent, attribution.source, formatDate(attribution.generatedAtTime)].filter(Boolean).join(' · ')}
        </div>
      </Listbox.Item>
    );
  },
);

FactViewerRow.displayName = 'FactViewer.Row';

//
// FactViewer
//

export const FactViewer = {
  Root: FactViewerRoot,
  Toolbar: FactViewerToolbar,
  List: FactViewerList,
  Graph: FactViewerGraph,
  Group: FactViewerGroup,
  Row: FactViewerRow,
};

export type {
  FactViewerGraphProps,
  FactViewerGroupProps,
  FactViewerListProps,
  FactViewerRootProps,
  FactViewerRowProps,
  FactViewerToolbarProps,
};
