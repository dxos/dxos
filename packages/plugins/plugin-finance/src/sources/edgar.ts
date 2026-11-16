//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { XMLParser } from 'fast-xml-parser';

import { Finance } from '#types';

import { TICKERS, canonicalTicker } from '../pipeline/tickers.ts';
import { SEC_USER_AGENT, SourceError, getText } from './http.ts';

/** The foreign-key source of everything read from EDGAR. */
export const SEC_SOURCE = 'sec.gov';

// SEC fair access allows 10 requests a second; a pause after each keeps well under it.
const polite = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Effect.tap(() => Effect.sleep('150 millis')));

const secText = (url: string) => polite(getText(url, SEC_USER_AGENT));

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  isArray: (name) => ['entry', 'nonDerivativeTransaction', 'reportingOwner', 'infoTable', 'item'].includes(name),
});

/** A value fast-xml-parser produced, as a trimmed string (it nests leaf values as `{ value }` in SEC forms). */
const str = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  }
  if (typeof value === 'object') {
    if ('value' in value) {
      return str(value.value);
    }
    if ('#text' in value) {
      return str(value['#text']);
    }
  }
  return undefined;
};

const num = (value: unknown): number | undefined => {
  const text = str(value);
  const parsed = text === undefined ? Number.NaN : Number(text.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const field = (value: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === 'object' && key in current ? Reflect.get(current, key) : undefined,
    value,
  );

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined ? [] : [value]);

const CompanyTickers = Schema.Record(
  Schema.String,
  Schema.Struct({ cik_str: Schema.Number, ticker: Schema.String, title: Schema.String }),
);

/** Ticker → zero-padded CIK, from EDGAR's company ticker list. */
export const loadCiks = (): Effect.Effect<Map<string, string>, SourceError> =>
  secText('https://www.sec.gov/files/company_tickers.json').pipe(
    Effect.flatMap((json) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(CompanyTickers))(json).pipe(
        Effect.mapError((cause) => new SourceError({ message: 'Unrecognized EDGAR ticker list', cause })),
      ),
    ),
    Effect.map(
      (entries) =>
        new Map(
          Object.values(entries).map(({ ticker, cik_str }) => [
            canonicalTicker(ticker),
            String(cik_str).padStart(10, '0'),
          ]),
        ),
    ),
  );

/** One filing as a company's EDGAR Atom feed lists it. */
export type FilingEntry = {
  readonly accession: string;
  readonly form: string;
  readonly formName?: string;
  /** ISO day it was filed. */
  readonly filed: string;
  /** The filing's index page. */
  readonly link: string;
  /** The 8-K items it reports (`items 2.02 and 9.01`). */
  readonly items?: string;
};

/** Parses a company's EDGAR Atom feed. */
export const parseFilingFeed = (xml: string): FilingEntry[] =>
  list(field(parser.parse(xml), 'feed', 'entry')).flatMap((entry) => {
    const content = field(entry, 'content');
    const accession = str(field(content, 'accession-number'));
    const form = str(field(content, 'filing-type'));
    const filed = str(field(content, 'filing-date'));
    const link = str(field(content, 'filing-href'));
    if (!accession || !form || !filed || !link) {
      return [];
    }
    const formName = str(field(content, 'form-name'));
    const items = str(field(content, 'items-desc'));
    return [{ accession, form, filed, link, ...(formName ? { formName } : {}), ...(items ? { items } : {}) }];
  });

/** A company's filings of one form type (Form 4 lists the insiders' filings about the issuer). */
export const companyFilings = (cik: string, form: string, count = 40): Effect.Effect<FilingEntry[], SourceError> =>
  secText(
    `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${encodeURIComponent(form)}&dateb=&owner=${form === '4' ? 'include' : 'exclude'}&count=${count}&output=atom`,
  ).pipe(Effect.map(parseFilingFeed));

const IndexJson = Schema.Struct({
  directory: Schema.Struct({ item: Schema.Array(Schema.Struct({ name: Schema.String })) }),
});

/** The XML documents of a filing, from its folder's `index.json`. */
const filingXmlFiles = (indexLink: string): Effect.Effect<{ folder: string; files: string[] }, SourceError> => {
  const folder = indexLink.replace(/\/[^/]*$/, '');
  return secText(`${folder}/index.json`).pipe(
    Effect.flatMap((json) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(IndexJson))(json).pipe(
        Effect.mapError((cause) => new SourceError({ message: `Unrecognized filing index ${folder}`, cause })),
      ),
    ),
    Effect.map(({ directory }) => ({
      folder,
      files: directory.item.map(({ name }) => name).filter((name) => name.endsWith('.xml')),
    })),
  );
};

/** The role an insider holds, as Form 4 states it. */
const roleOf = (owner: unknown): string => {
  const relation = field(owner, 'reportingOwnerRelationship');
  const title = str(field(relation, 'officerTitle'));
  const flags = [
    str(field(relation, 'isDirector')) === '1' || str(field(relation, 'isDirector')) === 'true'
      ? 'director'
      : undefined,
    str(field(relation, 'isTenPercentOwner')) === '1' || str(field(relation, 'isTenPercentOwner')) === 'true'
      ? '10% owner'
      : undefined,
  ].filter((flag) => flag !== undefined);
  return [title, ...flags].filter((part) => part !== undefined).join(', ') || 'insider';
};

/**
 * The non-derivative transactions of a Form 4 (`ownershipDocument`), one observation each: who traded, the code
 * (P purchase, S sale, A award, M option exercise, F tax withholding, G gift), shares, price and holdings after.
 */
export const parseForm4 = (xml: string, filing: Pick<FilingEntry, 'accession' | 'link'>): Finance.Observation[] => {
  const document = field(parser.parse(xml), 'ownershipDocument');
  const symbol = str(field(document, 'issuer', 'issuerTradingSymbol'));
  const issuer = str(field(document, 'issuer', 'issuerName'));
  const owners = list(field(document, 'reportingOwner'));
  const owner = str(field(owners[0], 'reportingOwnerId', 'rptOwnerName')) ?? 'unknown';
  const role = roleOf(owners[0]);
  return list(field(document, 'nonDerivativeTable', 'nonDerivativeTransaction')).flatMap((transaction, index) => {
    const date = str(field(transaction, 'transactionDate'));
    const code = str(field(transaction, 'transactionCoding', 'transactionCode'));
    const shares = num(field(transaction, 'transactionAmounts', 'transactionShares'));
    if (!date || !code || shares === undefined) {
      return [];
    }
    const price = num(field(transaction, 'transactionAmounts', 'transactionPricePerShare'));
    const after = num(field(transaction, 'postTransactionAmounts', 'sharesOwnedFollowingTransaction'));
    const direction = str(field(transaction, 'transactionAmounts', 'transactionAcquiredDisposedCode'));
    return [
      Finance.makeObservation({
        key: { source: SEC_SOURCE, id: `${filing.accession}#${index + 1}` },
        kind: 'insider-trade',
        ...(symbol ? { symbol: canonicalTicker(symbol) } : {}),
        ...(issuer ? { issuer } : {}),
        date: date.slice(0, 10),
        link: filing.link,
        values: {
          shares,
          ...(price !== undefined ? { price } : {}),
          ...(after !== undefined ? { sharesAfter: after } : {}),
        },
        labels: { owner, role, code, ...(direction ? { direction } : {}) },
      }),
    ];
  });
};

/** A ticker's Form 4 transactions filed on or after `since` (ISO day). */
export const insiderTrades = (cik: string, since: string): Effect.Effect<Finance.Observation[], SourceError> =>
  Effect.gen(function* () {
    const filings = (yield* companyFilings(cik, '4')).filter(({ form, filed }) => form === '4' && filed >= since);
    const observations: Finance.Observation[] = [];
    for (const filing of filings) {
      const { folder, files } = yield* filingXmlFiles(filing.link);
      if (files.length === 0) {
        continue;
      }
      observations.push(...parseForm4(yield* secText(`${folder}/${files[0]}`), filing));
    }
    return observations;
  });

/** A company's 8-K, 10-Q, 10-K and S-1 filings on or after `since`, one observation each. */
export const companyReports = (
  cik: string,
  ticker: string,
  since: string,
): Effect.Effect<Finance.Observation[], SourceError> =>
  Effect.gen(function* () {
    const filings: FilingEntry[] = [];
    for (const form of ['8-K', '10-Q', '10-K', 'S-1']) {
      filings.push(...(yield* companyFilings(cik, form, 10)).filter(({ filed }) => filed >= since));
    }
    return filings.map((filing) =>
      Finance.makeObservation({
        key: { source: SEC_SOURCE, id: filing.accession },
        kind: 'filing',
        symbol: ticker,
        date: filing.filed,
        link: filing.link,
        labels: {
          form: filing.form,
          ...(filing.formName ? { formName: filing.formName } : {}),
          ...(filing.items ? { items: filing.items } : {}),
        },
      }),
    );
  });

const issuerKey = (name: string): string =>
  name
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|CORP|CORPORATION|CO|COMPANY|LTD|PLC|HLDGS|HOLDINGS|GROUP|THE|CL [A-Z]|COM|NEW|DEL)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ISSUERS = new Map(
  TICKERS.flatMap(({ ticker, name, aliases }) =>
    [name, ...(aliases ?? [])].map((alias) => [issuerKey(alias), ticker] as const),
  ),
);

/** The known listing a 13F issuer name (`APPLE INC`, `ALPHABET INC CL A`) names, by normalized name. */
export const tickerForIssuer = (name: string): string | undefined => ISSUERS.get(issuerKey(name));

/** A 13F information table's rows: issuer, CUSIP, value (USD) and shares. */
export const parseInfoTable = (xml: string): Array<{ issuer: string; cusip: string; value: number; shares: number }> =>
  list(field(parser.parse(xml), 'informationTable', 'infoTable')).flatMap((row) => {
    const issuer = str(field(row, 'nameOfIssuer'));
    const cusip = str(field(row, 'cusip'));
    const value = num(field(row, 'value'));
    const shares = num(field(row, 'shrsOrPrnAmt', 'sshPrnamt'));
    return issuer && cusip && value !== undefined && shares !== undefined ? [{ issuer, cusip, value, shares }] : [];
  });

/** Well-known 13F filers whose latest holdings are read. */
export const FILERS: ReadonlyArray<{ readonly cik: string; readonly name: string }> = [
  { cik: '0001067983', name: 'Berkshire Hathaway' },
  { cik: '0001336528', name: 'Pershing Square Capital Management' },
  { cik: '0001649339', name: 'Scion Asset Management' },
  { cik: '0001350694', name: 'Bridgewater Associates' },
];

/**
 * A filer's latest 13F holdings: rows in a known listing, plus its ten largest positions. The rows of one filing share
 * its accession; a row's key adds its CUSIP.
 */
export const latestHoldings = (filer: {
  cik: string;
  name: string;
}): Effect.Effect<Finance.Observation[], SourceError> =>
  Effect.gen(function* () {
    const [filing] = (yield* companyFilings(filer.cik, '13F-HR', 2)).filter(({ form }) => form === '13F-HR');
    if (!filing) {
      return [];
    }
    const { folder, files } = yield* filingXmlFiles(filing.link);
    const table = files.find((name) => name !== 'primary_doc.xml');
    if (!table) {
      return [];
    }
    const rows = parseInfoTable(yield* secText(`${folder}/${table}`));
    // A filer lists one issuer once per share class and manager; rows are summed per CUSIP.
    const byCusip = new Map<string, { issuer: string; cusip: string; value: number; shares: number }>();
    for (const row of rows) {
      const previous = byCusip.get(row.cusip);
      byCusip.set(
        row.cusip,
        previous ? { ...previous, value: previous.value + row.value, shares: previous.shares + row.shares } : row,
      );
    }
    const ranked = [...byCusip.values()].sort((left, right) => right.value - left.value);
    const kept = ranked.filter((row, rank) => rank < 10 || tickerForIssuer(row.issuer) !== undefined);
    return kept.map((row) => {
      const ticker = tickerForIssuer(row.issuer);
      return Finance.makeObservation({
        key: { source: SEC_SOURCE, id: `${filing.accession}#${row.cusip}` },
        kind: 'holding',
        ...(ticker ? { symbol: ticker } : {}),
        issuer: row.issuer,
        date: filing.filed,
        link: filing.link,
        values: { value: row.value, shares: row.shares },
        labels: { holder: filer.name, cusip: row.cusip },
      });
    });
  });
