import { Ontology, Vocab, Vocabularies } from '@dxos/echo-memory';
//
// Copyright 2026 DXOS.org
//

/** Namespace of the finance terms schema.org lacks; the names follow FIBO (corporate actions, securities, ratings). */
export const FIN = 'https://dxos.org/ontology/finance/';

/** Namespace of the company entities the mention index links articles to, keyed by ticker. */
export const COMPANY = 'https://dxos.org/finance/company/';

const schema = (name: string) => `${Vocab.SCHEMA}${name}`;
const fin = (name: string) => `${FIN}${name}`;

const CORPORATION = schema('Corporation');
const ARTICLE = schema('NewsArticle');

type Term = Omit<Ontology.Entry, 'iri' | 'name' | 'label' | 'definedBy'> & { readonly label?: string };

const pack = (
  id: string,
  label: string,
  namespace: string,
  terms: Record<string, [local: string, Term]>,
): Vocabularies.Pack => ({
  id,
  label,
  namespace,
  entries: Object.entries(terms).map(([name, [local, term]]) =>
    Ontology.entry(name, { ...term, iri: `${namespace}${local}`, definedBy: namespace }),
  ),
});

/** schema.org's company and security terms. */
export const SCHEMA_FINANCE: Vocabularies.Pack = pack('schema-finance', 'schema.org finance', Vocab.SCHEMA, {
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
export const FINANCE: Vocabularies.Pack = pack('finance', 'Finance (FIBO-inspired)', FIN, {
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
export const PACKS: ReadonlyArray<Vocabularies.Pack> = [SCHEMA_FINANCE, FINANCE];

/** The finance ontology: the seed, schema.org and the finance packs. */
export const ontology = (base: ReadonlyArray<Vocabularies.Pack> = [Vocabularies.SCHEMA]): Ontology.Ontology =>
  Vocabularies.compose([...base, ...PACKS]);

/**
 * Predicates the deterministic and classification stages write: the mention index, sentiment and event type. They
 * never reach the extractor's prompt, so they are entries of their own rather than part of a pack.
 */
export const ANNOTATIONS = {
  mentions: Ontology.entry('mentions', { iri: schema('mentions'), definedBy: Vocab.SCHEMA }),
  headline: Ontology.entry('headline', { iri: schema('headline'), definedBy: Vocab.SCHEMA, domain: ARTICLE }),
  publisher: Ontology.entry('published_by', {
    iri: schema('publisher'),
    label: 'published by',
    definedBy: Vocab.SCHEMA,
  }),
  datePublished: Ontology.entry('date_published', {
    iri: schema('datePublished'),
    label: 'date published',
    definedBy: Vocab.SCHEMA,
  }),
  url: Ontology.entry('url', { iri: schema('url'), definedBy: Vocab.SCHEMA }),
  tickerSymbol: Ontology.entry('ticker_symbol', {
    iri: schema('tickerSymbol'),
    label: 'has ticker symbol',
    definedBy: Vocab.SCHEMA,
  }),
  sentiment: Ontology.entry('sentiment', { iri: fin('sentiment'), label: 'has sentiment', definedBy: FIN }),
  sentimentScore: Ontology.entry('sentiment_score', {
    iri: fin('sentimentScore'),
    label: 'has sentiment score',
    definedBy: FIN,
  }),
  sentimentAbout: Ontology.entry('sentiment_about', { iri: fin('sentimentAbout'), label: 'about', definedBy: FIN }),
  expressedIn: Ontology.entry('expressed_in', { iri: fin('expressedIn'), label: 'expressed in', definedBy: FIN }),
  eventType: Ontology.entry('event_type', { iri: fin('eventType'), label: 'reports event', definedBy: FIN }),
} as const;

const term = (name: string, local: string, label: string): Ontology.Entry =>
  Ontology.entry(name, { iri: fin(local), label, definedBy: FIN });

/**
 * Predicates the structured sources (prices, short volume, Form 4, 13F, filings, House disclosures) are written with,
 * deterministically. Each row is a node of its own graph that is `about` the company, so a query joins it to the
 * news about the same {@link companyIri}.
 */
export const MARKET = {
  about: Ontology.entry('about', { iri: schema('about'), definedBy: Vocab.SCHEMA }),
  observedOn: term('observed_on', 'observedOn', 'observed on'),
  open: term('open_price', 'openPrice', 'open price'),
  high: term('high_price', 'highPrice', 'high price'),
  low: term('low_price', 'lowPrice', 'low price'),
  close: term('close_price', 'closePrice', 'close price'),
  volume: term('trading_volume', 'tradingVolume', 'trading volume'),
  changePercent: term('daily_return_percent', 'dailyReturnPercent', 'daily return percent'),
  shortVolume: term('short_volume', 'shortVolume', 'short volume'),
  shortRatio: term('short_volume_ratio', 'shortVolumeRatio', 'short volume ratio'),
  insider: term('insider', 'insider', 'traded by insider'),
  insiderRole: term('insider_role', 'insiderRole', 'insider role'),
  insiderBuys: term('insider_buys', 'insiderBuys', 'insider buys shares of'),
  insiderSells: term('insider_sells', 'insiderSells', 'insider sells shares of'),
  transactionCode: term('transaction_code', 'transactionCode', 'transaction code'),
  shares: term('shares', 'shares', 'shares'),
  pricePerShare: term('price_per_share', 'pricePerShare', 'price per share'),
  sharesAfter: term('shares_owned_after', 'sharesOwnedAfter', 'shares owned after'),
  holdsPositionIn: Ontology.entry('holds_position_in', {
    iri: fin('holdsPositionIn'),
    label: 'holds position in',
    definedBy: FIN,
  }),
  positionValue: term('position_value_usd', 'positionValueUsd', 'position value usd'),
  files: term('files', 'files', 'files'),
  formType: term('form_type', 'formType', 'form type'),
  filingItems: term('filing_items', 'filingItems', 'filing items'),
  disclosesTrades: term('discloses_trades', 'disclosesTrades', 'discloses trades in'),
} as const;

/** The IRI of the company a ticker names. */
export const companyIri = (ticker: string): string => `${COMPANY}${encodeURIComponent(ticker.toUpperCase())}`;
