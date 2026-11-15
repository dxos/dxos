//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { RDF } from '@dxos/pipeline-rdf';
import { KnowledgeCard, type KnowledgeCardRow, TurtleSnippet, curie } from '@dxos/react-ui-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';

export type OntologyPanelProps = {
  /** The predicates the brain knows: the seed vocabulary plus those its extractors minted. */
  ontology: RDF.Ontology.Ontology;
  facts: RDF.Fact[];
  /** The IRI of the chosen predicate. */
  selected?: string;
  /** Makes each predicate selectable; choosing the chosen one again clears the choice. */
  onSelect?: (iri: string | undefined) => void;
};

type View = 'list' | 'ontology' | 'trig';

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'list', label: 'List' },
  { id: 'ontology', label: 'Ontology (TriG)' },
  { id: 'trig', label: 'Facts (TriG)' },
];

/** An extractor minted the predicate (it carries a creation time, or lives in the brain's namespace); else it is seed. */
const isMinted = (entry: RDF.Ontology.Entry, ontology: RDF.Ontology.Ontology): boolean =>
  entry.created !== undefined || entry.definedBy === ontology.namespace;

/** How many facts state each predicate, by its canonical IRI, so merged-away predicates count toward their survivor. */
export const predicateUsage = (facts: readonly RDF.Fact[], ontology: RDF.Ontology.Ontology): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    const iri = RDF.Mapping.predicateOf(fact, ontology);
    const canonical = ontology.canonical(iri)?.iri ?? iri;
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
  }
  return counts;
};

/**
 * Every predicate the brain knows, most used first, with its metadata and how often the facts use it, plus the
 * ontology graph and the facts as TriG. Seed predicates keep their vocabulary's IRIs (schema.org, FOAF, …); those an
 * extractor minted live in the brain's own namespace.
 */
export const OntologyPanel = Util.composable<HTMLDivElement, OntologyPanelProps>(
  ({ ontology, facts, selected, onSelect, ...props }, forwardedRef) => {
    const [view, setView] = useState<View>('list');
    const usage = useMemo(() => predicateUsage(facts, ontology), [facts, ontology]);
    const entries = useMemo(
      () =>
        [...ontology.entries].sort(
          (left, right) =>
            (usage.get(right.iri) ?? 0) - (usage.get(left.iri) ?? 0) || left.name.localeCompare(right.name),
        ),
      [ontology, usage],
    );
    const minted = useMemo(() => entries.filter((entry) => isMinted(entry, ontology)).length, [entries, ontology]);
    const text = useMemo(
      () =>
        view === 'ontology'
          ? RDF.Graph.ontologyToTriG(ontology)
          : view === 'trig'
            ? RDF.Graph.toTriG(facts, ontology)
            : '',
      [view, ontology, facts],
    );

    return (
      <Panel.Root {...Util.composableProps(props)} ref={forwardedRef}>
        <Panel.Header>
          <Toolbar.Root>
            <Toolbar.Text classNames='grow'>
              Predicates ({entries.length}, {minted} minted)
            </Toolbar.Text>
            {VIEWS.map(({ id, label }) => (
              <Button.Root key={id} variant={view === id ? 'primary' : 'ghost'} onClick={() => setView(id)}>
                {label}
              </Button.Root>
            ))}
            {onSelect && (
              <Button.Root
                icon='ph--x--regular'
                iconOnly
                label='Clear predicate filter'
                disabled={!selected}
                onClick={() => onSelect(undefined)}
              />
            )}
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              {view === 'list' ? (
                <Layout.Flex column gap='sm' classNames='p-2'>
                  {entries.map((entry) => (
                    <PredicateCard
                      key={entry.iri}
                      entry={entry}
                      count={usage.get(entry.iri) ?? 0}
                      ontology={ontology}
                      selected={selected === entry.iri}
                      onClick={onSelect && (() => onSelect(selected === entry.iri ? undefined : entry.iri))}
                    />
                  ))}
                </Layout.Flex>
              ) : text.trim().length === 0 ? (
                <Status.Empty>Nothing to show.</Status.Empty>
              ) : (
                <TurtleSnippet className='p-2 overflow-x-auto text-xs select-text cursor-text' source={text} />
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    );
  },
);

OntologyPanel.displayName = 'OntologyPanel';

type PredicateCardProps = {
  entry: RDF.Ontology.Entry;
  count: number;
  ontology: RDF.Ontology.Ontology;
  selected?: boolean;
  onClick?: () => void;
};

/** One predicate as a read-only form: its label and provenance head the card, its IRI, use and metadata follow. */
const PredicateCard = ({ entry, count, ontology, selected, onClick }: PredicateCardProps) => {
  const minted = isMinted(entry, ontology);
  const short = (iri: string) => curie(iri, ontology.namespace);
  const vocabulary = minted
    ? 'brain'
    : entry.definedBy
      ? short(entry.definedBy).split(':')[0]
      : short(entry.iri).split(':')[0];
  const details: [string, string][] = [
    ['description', entry.description ?? ''],
    ['synonyms', entry.synonyms?.join(', ') ?? ''],
    [
      'domain → range',
      entry.domain || entry.range
        ? `${entry.domain ? short(entry.domain) : 'any'} → ${entry.range ? short(entry.range) : 'any'}`
        : '',
    ],
    ['inverse', entry.inverse ? short(entry.inverse) : ''],
    ['equivalent', (entry.equivalents ?? []).map(short).join(', ')],
    ['created', [entry.created, entry.creator].filter(Boolean).join(' · ')],
    ['example', entry.example ? `“${entry.example}”` : ''],
    ['replaced by', entry.replacedBy ? short(entry.replacedBy) : ''],
  ];
  const rows: KnowledgeCardRow[] = [
    {
      label: 'iri',
      value: (
        <Card.Text truncate classNames='font-mono' title={entry.iri}>
          {short(entry.iri)}
        </Card.Text>
      ),
    },
    { label: 'facts', value: <Card.Text>{count}</Card.Text> },
    ...details
      .filter(([, value]) => value.length > 0)
      .map(([label, value]) => ({ label, value: <Card.Text lines={3}>{value}</Card.Text> })),
  ];
  return (
    <KnowledgeCard
      icon='ph--arrow-right--regular'
      title={
        <>
          {entry.label}{' '}
          <Tag.Tag hue={minted ? 'amber' : 'sky'}>{minted ? `minted · ${vocabulary}` : `seed · ${vocabulary}`}</Tag.Tag>
        </>
      }
      rows={rows}
      testId='ontology-predicate'
      selected={selected}
      onClick={onClick}
    />
  );
};
