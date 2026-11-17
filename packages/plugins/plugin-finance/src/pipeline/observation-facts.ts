//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Fact, Hash, Ontology, Vocab } from '@dxos/echo-memory';

import { type Finance } from '#types';

import { type Extractor, type Provenance, type Statement, agentIri, companyTerm, graphOf, literal } from './facts.ts';
import { listing } from './tickers.ts';
import { ANNOTATIONS, MARKET } from './vocabulary.ts';

/** The program that writes observation facts; no model. */
export const OBSERVATION_EXTRACTOR: Extractor = { id: 'finance-observations', model: 'deterministic', version: '1' };

/** Who published each foreign-key source, as its facts' agent. */
const PUBLISHERS: Record<string, string> = {
  'sec.gov': 'SEC EDGAR',
  'query1.finance.yahoo.com': 'Yahoo Finance',
  'cdn.finra.org': 'FINRA',
  'disclosures-clerk.house.gov': 'House Clerk',
};

/** The observation's foreign key as the provenance of its facts. */
export const observationSource = (observation: Finance.Observation): string => {
  const [key] = Obj.getMeta(observation).keys;
  return key ? `${key.source}:${key.id}` : `observation:${observation.id}`;
};

const provenanceOf = (observation: Finance.Observation): Provenance => {
  const [key] = Obj.getMeta(observation).keys;
  const publisher = PUBLISHERS[key?.source ?? ''] ?? key?.source ?? 'unknown';
  return {
    source: observationSource(observation),
    agent: agentIri(publisher),
    agentLabel: publisher,
    time: observation.date.length === 10 ? `${observation.date}T00:00:00.000Z` : observation.date,
    hash: Hash.text(
      JSON.stringify([observation.kind, observation.symbol, observation.date, observation.values, observation.labels]),
    ),
  };
};

const number = (value: number | undefined): Fact.LiteralTerm[] => (value === undefined ? [] : [literal(String(value))]);

const person = (name: string): Fact.EncodedEntityTerm => ({
  kind: 'entity',
  entity: `${Vocab.ENTITY}person/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`,
  label: name,
  type: 'person',
});

const organization = (name: string): Fact.EncodedEntityTerm => ({
  kind: 'entity',
  entity: agentIri(name),
  label: name,
  type: 'org',
});

/** The company an observation is about: the known listing by ticker, else the issuer by name. */
const subjectOf = (observation: Finance.Observation): Fact.EncodedEntityTerm | undefined =>
  observation.symbol
    ? companyTerm(observation.symbol, listing(observation.symbol)?.name ?? observation.issuer)
    : observation.issuer
      ? organization(observation.issuer)
      : undefined;

/** The row as a node of its own graph (slugs are local to their graph). */
const node = (label: string): Fact.EncodedEntityTerm => ({ kind: 'entity', entity: 'row', label, type: 'event' });

/**
 * The facts one observation states, written without a model on the predicates the text extraction's ticker entities
 * share: a price bar, a short-volume day, an insider trade, a 13F position, a filing or a House disclosure. Each is a
 * node `about` the company plus a direct edge where one reads naturally (`insider —insider sells shares of→ company`,
 * `holder —holds position in→ company`, `company —files→ filing`).
 */
export const observationFacts = (observation: Finance.Observation): Fact.Fact[] => {
  const provenance = provenanceOf(observation);
  const company = subjectOf(observation);
  const day = literal(observation.date);
  const { values, labels } = observation;
  const statements: Statement[] = [];
  const add = (subject: Fact.EncodedTerm, predicate: Ontology.Entry, objects: Fact.EncodedTerm[]) =>
    objects.forEach((object) => statements.push([subject, predicate, object]));

  switch (observation.kind) {
    case 'price':
    case 'short-volume': {
      if (!company) {
        return [];
      }
      const row = node(`${observation.symbol} ${observation.kind} ${observation.date}`);
      add(row, MARKET.about, [company]);
      add(row, MARKET.observedOn, [day]);
      if (observation.kind === 'price') {
        add(row, MARKET.open, number(values.open));
        add(row, MARKET.high, number(values.high));
        add(row, MARKET.low, number(values.low));
        add(row, MARKET.close, number(values.close));
        add(row, MARKET.volume, number(values.volume));
        add(row, MARKET.changePercent, number(values.changePercent));
      } else {
        add(row, MARKET.shortVolume, number(values.shortVolume));
        add(row, MARKET.volume, number(values.totalVolume));
        add(row, MARKET.shortRatio, number(values.shortRatio));
      }
      break;
    }

    case 'insider-trade': {
      if (!company || !labels.owner) {
        return [];
      }
      const insider = person(labels.owner);
      const row = node(
        `${labels.owner} ${labels.code} ${observation.symbol ?? observation.issuer} ${observation.date}`,
      );
      add(row, MARKET.about, [company]);
      add(row, MARKET.insider, [insider]);
      add(row, MARKET.observedOn, [day]);
      add(row, MARKET.transactionCode, [literal(labels.code)]);
      add(row, MARKET.shares, number(values.shares));
      add(row, MARKET.pricePerShare, number(values.price));
      add(row, MARKET.sharesAfter, number(values.sharesAfter));
      add(insider, MARKET.insiderRole, labels.role ? [literal(labels.role)] : []);
      // Open-market purchases and sales are the trades that signal; awards, exercises and withholdings are not.
      if (labels.code === 'P') {
        add(insider, MARKET.insiderBuys, [company]);
      } else if (labels.code === 'S') {
        add(insider, MARKET.insiderSells, [company]);
      }
      break;
    }

    case 'holding': {
      if (!company || !labels.holder) {
        return [];
      }
      const holder = organization(labels.holder);
      const row = node(`${labels.holder} position in ${observation.symbol ?? observation.issuer}`);
      add(holder, MARKET.holdsPositionIn, [company]);
      add(row, MARKET.about, [company]);
      add(row, MARKET.insider, [holder]);
      add(row, MARKET.observedOn, [day]);
      add(row, MARKET.shares, number(values.shares));
      add(row, MARKET.positionValue, number(values.value));
      break;
    }

    case 'filing': {
      if (!company || !observation.link) {
        return [];
      }
      const filing: Fact.EncodedEntityTerm = {
        kind: 'entity',
        entity: observation.link,
        label: `${labels.form} ${observation.date}`,
        type: 'thing',
      };
      add(company, MARKET.files, [filing]);
      add(filing, MARKET.formType, [literal(labels.form)]);
      add(filing, ANNOTATIONS.datePublished, [day]);
      add(filing, MARKET.filingItems, labels.items ? [literal(labels.items)] : []);
      break;
    }

    case 'congress-filing': {
      if (!labels.member || !observation.link) {
        return [];
      }
      const report: Fact.EncodedEntityTerm = {
        kind: 'entity',
        entity: observation.link,
        label: `${labels.member} periodic transaction report ${observation.date}`,
        type: 'thing',
      };
      add(person(labels.member), MARKET.disclosesTrades, [report]);
      add(report, ANNOTATIONS.datePublished, [day]);
      break;
    }
  }

  return statements.length === 0 ? [] : graphOf(provenance, observation.kind, OBSERVATION_EXTRACTOR, statements);
};
