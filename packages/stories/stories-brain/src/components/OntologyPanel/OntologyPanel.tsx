//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { RDF } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
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
};

type View = 'list' | 'ontology' | 'trig';

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'list', label: 'List' },
  { id: 'ontology', label: 'Ontology (TriG)' },
  { id: 'trig', label: 'Facts (TriG)' },
];

/** The prefixed name an IRI reads as, given the TriG prefixes and the brain's namespace. */
const curie = (iri: string, namespace: string): string => {
  const prefixes: [string, string][] = [['brain', namespace], ...Object.entries(RDF.Graph.PREFIXES)];
  const match = prefixes
    .filter(([, base]) => iri.startsWith(base))
    .sort(([, left], [, right]) => right.length - left.length)[0];
  return match ? `${match[0]}:${iri.slice(match[1].length)}` : `<${iri}>`;
};

/**
 * Every predicate the brain knows, with its metadata and how often the facts use it, plus the ontology graph as Turtle
 * and the facts as TriG. Seed predicates keep their vocabulary's IRIs (schema.org, FOAF, ...); those an extractor minted
 * live in the brain's own namespace.
 */
export const OntologyPanel = Util.composable<HTMLDivElement, OntologyPanelProps>(
  ({ ontology, facts, ...props }, forwardedRef) => {
    const [view, setView] = useState<View>('list');
    const usage = useMemo(() => {
      const counts = new Map<string, number>();
      for (const fact of facts) {
        const iri = RDF.Mapping.predicateOf(fact, ontology);
        const canonical = ontology.canonical(iri)?.iri ?? iri;
        counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
      }
      return counts;
    }, [facts, ontology]);
    const entries = useMemo(
      () =>
        [...ontology.entries].sort(
          (left, right) =>
            (usage.get(right.iri) ?? 0) - (usage.get(left.iri) ?? 0) || left.name.localeCompare(right.name),
        ),
      [ontology, usage],
    );
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
              Predicates ({entries.length}, {entries.filter((entry) => entry.definedBy === ontology.namespace).length}{' '}
              minted)
            </Toolbar.Text>
            {VIEWS.map(({ id, label }) => (
              <Button.Root key={id} variant={view === id ? 'primary' : 'ghost'} onClick={() => setView(id)}>
                {label}
              </Button.Root>
            ))}
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              {view === 'list' ? (
                <div className='flex flex-col'>
                  {entries.map((entry) => (
                    <PredicateRow key={entry.iri} entry={entry} count={usage.get(entry.iri) ?? 0} ontology={ontology} />
                  ))}
                </div>
              ) : text.trim().length === 0 ? (
                <Status.Empty>Nothing to show.</Status.Empty>
              ) : (
                <pre className='p-2 text-xs font-mono whitespace-pre-wrap'>{text}</pre>
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    );
  },
);

OntologyPanel.displayName = 'OntologyPanel';

const PredicateRow = ({
  entry,
  count,
  ontology,
}: {
  entry: RDF.Ontology.Entry;
  count: number;
  ontology: RDF.Ontology.Ontology;
}) => {
  const minted = entry.definedBy === ontology.namespace;
  const vocabulary = minted ? 'brain' : entry.definedBy ? curie(entry.definedBy, ontology.namespace).split(':')[0] : '';
  const details: [string, string][] = [
    ['synonyms', entry.synonyms?.join(', ') ?? ''],
    [
      'domain -> range',
      entry.domain || entry.range
        ? `${entry.domain ? curie(entry.domain, ontology.namespace) : 'any'} -> ${entry.range ? curie(entry.range, ontology.namespace) : 'any'}`
        : '',
    ],
    ['inverse', entry.inverse ? curie(entry.inverse, ontology.namespace) : ''],
    ['equivalent', (entry.equivalents ?? []).map((iri) => curie(iri, ontology.namespace)).join(', ')],
    ['created', [entry.created, entry.creator].filter(Boolean).join(' · ')],
    ['example', entry.example ? `"${entry.example}"` : ''],
    ['replaced by', entry.replacedBy ? curie(entry.replacedBy, ontology.namespace) : ''],
  ];
  return (
    <div className='flex flex-col gap-1 border-b border-separator-subtle px-2 py-2'>
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{entry.label}</span>
        <span className='text-sm font-mono text-fg-subtle truncate grow'>{curie(entry.iri, ontology.namespace)}</span>
        {vocabulary && <Tag.Tag hue={minted ? 'amber' : 'sky'}>{vocabulary}</Tag.Tag>}
        <span className='shrink-0 tabular-nums text-fg-subtle'>{count}</span>
      </div>
      {entry.description && <span className='text-sm'>{entry.description}</span>}
      {details
        .filter(([, value]) => value.length > 0)
        .map(([label, value]) => (
          <span key={label} className='text-xs text-fg-muted'>
            <span className='text-fg-subtle'>{label}:</span> {value}
          </span>
        ))}
    </div>
  );
};
