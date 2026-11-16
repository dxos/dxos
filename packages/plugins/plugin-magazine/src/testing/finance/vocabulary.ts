//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** Namespace of the finance terms schema.org lacks; the names follow FIBO (corporate actions, securities, ratings). */
export const FIN = 'https://dxos.org/ontology/finance/';

/** Namespace of the company entities the mention index links articles to, keyed by ticker. */
export const COMPANY = 'https://dxos.org/finance/company/';

const schema = (name: string) => `${RDF.Vocab.SCHEMA}${name}`;
const fin = (name: string) => `${FIN}${name}`;

const CORPORATION = schema('Corporation');
const ARTICLE = schema('NewsArticle');

type Term = Omit<RDF.Ontology.Entry, 'iri' | 'name' | 'label' | 'definedBy'> & { readonly label?: string };

const pack = (
  id: string,
  label: string,
  namespace: string,
  terms: Record<string, [local: string, Term]>,
): RDF.Vocabularies.Pack => ({
  id,
  label,
  namespace,
  entries: Object.entries(terms).map(([name, [local, term]]) =>
    RDF.Ontology.entry(name, { ...term, iri: `${namespace}${local}`, definedBy: namespace }),
  ),
});

/** schema.org's company and security terms. */
export const SCHEMA_FINANCE: RDF.Vocabularies.Pack = pack('schema-finance', 'schema.org finance', RDF.Vocab.SCHEMA, {
  ticker_symbol: [
    'tickerSymbol',
    { label: 'has ticker symbol', synonyms: ['trades as', 'ticker'], domain: CORPORATION },
  ],
  legal_name: ['legalName', { label: 'has legal name', synonyms: ['legally named'], domain: CORPORATION }],
  brand: ['brand', { label: 'has brand', synonyms: ['sells brand', 'owns brand'] }],
  number_of_employees: [
    'numberOfEmployees',
    { label: 'has employee count', synonyms: ['employs people', 'headcount'], domain: CORPORATION },
  ],
  competitor: ['competitor', { label: 'competes with', synonyms: ['rival of', 'rivals'], domain: CORPORATION }],
});

/**
 * Corporate actions, results, analyst coverage and market moves news states, named after FIBO's concepts
 * (`fibo-fbc`, `fibo-sec`, `fibo-be`) in a namespace of their own, since FIBO spreads them over many modules.
 */
export const FINANCE: RDF.Vocabularies.Pack = pack('finance', 'Finance (FIBO-inspired)', FIN, {
  listed_on: ['listedOn', { label: 'listed on', synonyms: ['trades on exchange', 'is listed on'] }],
  acquires: [
    'acquires',
    { label: 'acquires', synonyms: ['agrees to buy', 'takes over', 'to acquire', 'buys company'], range: CORPORATION },
  ],
  merges_with: ['mergesWith', { label: 'merges with', synonyms: ['to merge with', 'combines with'] }],
  invests_in: ['investsIn', { label: 'invests in', synonyms: ['takes stake in', 'buys stake in', 'raises stake in'] }],
  divests: ['divests', { label: 'divests', synonyms: ['sells stake in', 'cuts stake in', 'spins off'] }],
  reports_earnings: [
    'reportsEarnings',
    {
      label: 'reports earnings',
      synonyms: ['reports results', 'posts quarterly results', 'reports quarterly earnings'],
      description: 'A company reports results for a period; the object is the period or the headline figure.',
    },
  ],
  reports_revenue: ['reportsRevenue', { label: 'reports revenue of', synonyms: ['has revenue of', 'revenue'] }],
  reports_eps: ['reportsEarningsPerShare', { label: 'reports eps of', synonyms: ['earnings per share', 'eps'] }],
  issues_guidance: [
    'issuesGuidance',
    { label: 'issues guidance', synonyms: ['forecasts', 'guides', 'sets outlook', 'raises guidance', 'cuts guidance'] },
  ],
  beats_estimates: ['beatsEstimates', { label: 'beats estimates', synonyms: ['tops estimates', 'beats expectations'] }],
  misses_estimates: [
    'missesEstimates',
    { label: 'misses estimates', synonyms: ['falls short of estimates', 'misses expectations'] },
  ],
  has_price_target: [
    'hasPriceTarget',
    {
      label: 'has price target',
      synonyms: ['price target', 'sets price target', 'raises price target', 'cuts price target'],
      description: 'The price target an analyst or firm sets for a stock; the object is the price.',
    },
  ],
  upgrades: ['upgrades', { label: 'upgrades', synonyms: ['raises rating on', 'upgraded'], range: CORPORATION }],
  downgrades: ['downgrades', { label: 'downgrades', synonyms: ['lowers rating on', 'downgraded'], range: CORPORATION }],
  rates: ['rates', { label: 'rates', synonyms: ['initiates coverage of', 'has rating', 'rated'] }],
  issues_security: [
    'issuesSecurity',
    { label: 'issues security', synonyms: ['issues bonds', 'sells shares', 'offers shares', 'prices offering'] },
  ],
  goes_public: ['goesPublic', { label: 'goes public', synonyms: ['files for ipo', 'ipo', 'lists shares'] }],
  pays_dividend: ['paysDividend', { label: 'pays dividend', synonyms: ['declares dividend', 'raises dividend'] }],
  buys_back: ['repurchasesShares', { label: 'repurchases shares', synonyms: ['buys back shares', 'buyback'] }],
  stock_rises: [
    'stockRises',
    { label: 'stock rises', synonyms: ['shares rise', 'shares jump', 'stock surges', 'stock gains', 'rallies'] },
  ],
  stock_falls: [
    'stockFalls',
    { label: 'stock falls', synonyms: ['shares fall', 'shares drop', 'stock slides', 'stock plunges', 'tumbles'] },
  ],
  has_market_cap: ['hasMarketCapitalization', { label: 'has market cap', synonyms: ['market value', 'valued at'] }],
  supplies: ['supplies', { label: 'supplies', synonyms: ['supplier to', 'provides chips to'] }],
  partners_with: ['partnersWith', { label: 'partners with', synonyms: ['teams up with', 'signs deal with'] }],
  investigated_by: [
    'investigatedBy',
    { label: 'investigated by', synonyms: ['probed by', 'faces probe from', 'sued by'] },
  ],
  chief_executive_of: ['chiefExecutiveOf', { label: 'ceo of', synonyms: ['chief executive of'] }],
  sets_interest_rate: [
    'setsInterestRate',
    { label: 'sets interest rate', synonyms: ['raises rates', 'cuts rates', 'holds rates'] },
  ],
  holds_position_in: ['holdsPositionIn', { label: 'holds position in', synonyms: ['owns shares of', 'holds shares'] }],
});

/** The packs finance extraction is seeded with. */
export const PACKS: ReadonlyArray<RDF.Vocabularies.Pack> = [SCHEMA_FINANCE, FINANCE];

/** The finance ontology: the seed, schema.org and the finance packs. */
export const ontology = (
  base: ReadonlyArray<RDF.Vocabularies.Pack> = [RDF.Vocabularies.SCHEMA],
): RDF.Ontology.Ontology => RDF.Vocabularies.compose([...base, ...PACKS]);

/**
 * Predicates the deterministic and classification stages write: the mention index, sentiment and event type. They
 * never reach the extractor's prompt, so they are entries of their own rather than part of a pack.
 */
export const ANNOTATIONS = {
  mentions: RDF.Ontology.entry('mentions', { iri: schema('mentions'), definedBy: RDF.Vocab.SCHEMA }),
  headline: RDF.Ontology.entry('headline', { iri: schema('headline'), definedBy: RDF.Vocab.SCHEMA, domain: ARTICLE }),
  publisher: RDF.Ontology.entry('published_by', {
    iri: schema('publisher'),
    label: 'published by',
    definedBy: RDF.Vocab.SCHEMA,
  }),
  datePublished: RDF.Ontology.entry('date_published', {
    iri: schema('datePublished'),
    label: 'date published',
    definedBy: RDF.Vocab.SCHEMA,
  }),
  url: RDF.Ontology.entry('url', { iri: schema('url'), definedBy: RDF.Vocab.SCHEMA }),
  tickerSymbol: RDF.Ontology.entry('ticker_symbol', {
    iri: schema('tickerSymbol'),
    label: 'has ticker symbol',
    definedBy: RDF.Vocab.SCHEMA,
  }),
  sentiment: RDF.Ontology.entry('sentiment', { iri: fin('sentiment'), label: 'has sentiment', definedBy: FIN }),
  sentimentScore: RDF.Ontology.entry('sentiment_score', {
    iri: fin('sentimentScore'),
    label: 'has sentiment score',
    definedBy: FIN,
  }),
  sentimentAbout: RDF.Ontology.entry('sentiment_about', { iri: fin('sentimentAbout'), label: 'about', definedBy: FIN }),
  expressedIn: RDF.Ontology.entry('expressed_in', { iri: fin('expressedIn'), label: 'expressed in', definedBy: FIN }),
  eventType: RDF.Ontology.entry('event_type', { iri: fin('eventType'), label: 'reports event', definedBy: FIN }),
} as const;

/** The IRI of the company a ticker names. */
export const companyIri = (ticker: string): string => `${COMPANY}${encodeURIComponent(ticker.toUpperCase())}`;
