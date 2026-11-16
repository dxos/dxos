//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { observationFacts } from '../pipeline/observation-facts.ts';
import { MARKET, companyIri } from '../pipeline/vocabulary.ts';
import {
  type FilingEntry,
  collectFilings,
  parseFilingFeed,
  parseForm4,
  parseInfoTable,
  shareHoldings,
  tickerForIssuer,
} from './edgar.ts';
import { parseHouseIndex, unzip } from './house.ts';
import { parseChart, parseShortVolume } from './market-data.ts';

const FILING_FEED = `<?xml version="1.0" encoding="ISO-8859-1" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <category label="form type" scheme="https://www.sec.gov/" term="8-K" />
  <content type="text/xml">
    <accession-number>0001045810-26-000082</accession-number>
    <filing-date>2026-11-12</filing-date>
    <filing-href>https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/0001045810-26-000082-index.htm</filing-href>
    <filing-type>8-K</filing-type>
    <form-name>Current report</form-name>
    <items-desc>items 5.02 and 9.01</items-desc>
  </content>
</entry>
</feed>`;

const FORM_4 = `<?xml version="1.0"?>
<ownershipDocument>
  <issuer><issuerCik>0001045810</issuerCik><issuerName>NVIDIA CORP</issuerName><issuerTradingSymbol>NVDA</issuerTradingSymbol></issuer>
  <reportingOwner>
    <reportingOwnerId><rptOwnerCik>0001197647</rptOwnerCik><rptOwnerName>COXE TENCH</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>0</isOfficer></reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate><value>2026-11-04</value></transactionDate>
      <transactionCoding><transactionCode>S</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>500000</value></transactionShares>
        <transactionPricePerShare><value>182.5</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>23171360</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

const INFO_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><cusip>037833100</cusip><value>60000000000</value><shrsOrPrnAmt><sshPrnamt>280000000</sshPrnamt></shrsOrPrnAmt></infoTable>
  <infoTable><nameOfIssuer>OCCIDENTAL PETE CORP</nameOfIssuer><cusip>674599105</cusip><value>12000000000</value><shrsOrPrnAmt><sshPrnamt>264000000</sshPrnamt></shrsOrPrnAmt></infoTable>
</informationTable>`;

const PREFIXED_INFO_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<ns1:informationTable xmlns:ns1="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:cusip>037833100</ns1:cusip><ns1:value>60000000000</ns1:value><ns1:shrsOrPrnAmt><ns1:sshPrnamt>280000000</ns1:sshPrnamt></ns1:shrsOrPrnAmt></ns1:infoTable>
</ns1:informationTable>`;

const OPTIONS_INFO_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><cusip>037833100</cusip><value>1000</value><shrsOrPrnAmt><sshPrnamt>10</sshPrnamt></shrsOrPrnAmt></infoTable>
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><cusip>037833100</cusip><value>500</value><shrsOrPrnAmt><sshPrnamt>5</sshPrnamt></shrsOrPrnAmt></infoTable>
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><cusip>037833100</cusip><value>9000</value><shrsOrPrnAmt><sshPrnamt>90</sshPrnamt></shrsOrPrnAmt><putCall>Put</putCall></infoTable>
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><cusip>037833100</cusip><value>7000</value><shrsOrPrnAmt><sshPrnamt>70</sshPrnamt></shrsOrPrnAmt><putCall>Call</putCall></infoTable>
</informationTable>`;

const CHART = JSON.stringify({
  chart: {
    result: [
      {
        timestamp: [1794580200, 1794666600, 1794753000],
        indicators: {
          quote: [
            {
              open: [180, 182, null],
              high: [185, 186, null],
              low: [179, 180, null],
              close: [184, 182.16, null],
              volume: [1e6, 2e6, null],
            },
          ],
        },
      },
    ],
  },
});

/** A zip archive of stored entries, written by hand so the reader is tested against the format, not itself. */
const zip = (files: Record<string, string>, deflate = false): Uint8Array => {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const raw = encoder.encode(content);
    const data = deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, deflate ? 8 : 0, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, raw.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(10, deflate ? 8 : 0, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, raw.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centrals.length, true);
  endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, end];
  const archive = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    archive.set(part, at);
    at += part.length;
  }
  return archive;
};

const HOUSE = `﻿<?xml version="1.0" encoding="utf-8"?>
<FinancialDisclosure>
  <Member><First>Jane</First><Last>Doe</Last><FilingType>P</FilingType><StateDst>CA12</StateDst><Year>2026</Year><FilingDate>11/3/2026</FilingDate><DocID>20031234</DocID></Member>
  <Member><First>John</First><Last>Roe</Last><FilingType>A</FilingType><StateDst>TX01</StateDst><Year>2026</Year><FilingDate>11/4/2026</FilingDate><DocID>10070000</DocID></Member>
  <Member><First>Old</First><Last>Filer</Last><FilingType>P</FilingType><StateDst>NY03</StateDst><Year>2026</Year><FilingDate>1/9/2026</FilingDate><DocID>20020000</DocID></Member>
</FinancialDisclosure>`;

const predicates = (facts: ReturnType<typeof observationFacts>) => facts.map((fact) => fact.assertion.predicateIri);

describe('SEC EDGAR', () => {
  test('a company filing feed', () => {
    expect(parseFilingFeed(FILING_FEED)).toEqual([
      {
        accession: '0001045810-26-000082',
        form: '8-K',
        formName: 'Current report',
        filed: '2026-11-12',
        link: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/0001045810-26-000082-index.htm',
        items: 'items 5.02 and 9.01',
      },
    ]);
  });

  test('Form 4: one observation per transaction, keyed by accession, and an insider-sells edge', () => {
    const [trade] = parseForm4(FORM_4, { accession: '0001197647-26-000013', link: 'https://www.sec.gov/x' });
    expect(Obj.getMeta(trade).keys).toEqual([{ source: 'sec.gov', id: '0001197647-26-000013#1' }]);
    expect(trade).toMatchObject({
      kind: 'insider-trade',
      symbol: 'NVDA',
      date: '2026-11-04',
      values: { shares: 500000, price: 182.5, sharesAfter: 23171360 },
      labels: { owner: 'COXE TENCH', role: 'director', code: 'S', direction: 'D' },
    });
    const facts = observationFacts(trade);
    expect(predicates(facts)).toContain(MARKET.insiderSells.iri);
    const sells = facts.find((fact) => fact.assertion.predicateIri === MARKET.insiderSells.iri);
    expect(sells?.assertion.object).toMatchObject({ entity: companyIri('NVDA') });
    expect(facts.every((fact) => fact.attribution.source === 'sec.gov:0001197647-26-000013#1')).toBe(true);
  });

  test('13F rows and issuer names', () => {
    expect(parseInfoTable(INFO_TABLE).map(({ issuer, shares }) => [issuer, shares])).toEqual([
      ['APPLE INC', 280000000],
      ['OCCIDENTAL PETE CORP', 264000000],
    ]);
    expect(tickerForIssuer('APPLE INC')).toBe('AAPL');
    expect(tickerForIssuer('ALPHABET INC CL A')).toBe('GOOGL');
    expect(tickerForIssuer('BANK AMERICA CORP')).toBe('BAC');
    expect(tickerForIssuer('OCCIDENTAL PETE CORP')).toBeUndefined();
  });

  test('13F rows of a namespace-prefixed information table', () => {
    expect(parseInfoTable(PREFIXED_INFO_TABLE)).toEqual([
      { issuer: 'APPLE INC', cusip: '037833100', value: 60000000000, shares: 280000000 },
    ]);
  });

  test('13F put and call rows are told apart and left out of share holdings', () => {
    const rows = parseInfoTable(OPTIONS_INFO_TABLE);
    expect(rows.map(({ shares, putCall }) => [shares, putCall])).toEqual([
      [10, undefined],
      [5, undefined],
      [90, 'put'],
      [70, 'call'],
    ]);
    expect(shareHoldings(rows)).toEqual([{ issuer: 'APPLE INC', cusip: '037833100', value: 1500, shares: 15 }]);
  });

  test('a filing feed is paged until it reaches past the window', () => {
    const entry = (filed: string, index: number): FilingEntry => ({
      accession: `a-${index}`,
      form: '4',
      filed,
      link: `https://www.sec.gov/${index}`,
    });
    const feed = ['2026-11-10', '2026-11-08', '2026-11-05', '2026-11-01', '2026-10-20', '2026-10-01'].map(entry);
    const starts: number[] = [];
    const filings = Effect.runSync(
      collectFilings(
        (start) =>
          Effect.sync(() => {
            starts.push(start);
            return feed.slice(start, start + 2);
          }),
        '2026-11-01',
        2,
      ),
    );
    expect(filings.map(({ filed }) => filed)).toEqual(['2026-11-10', '2026-11-08', '2026-11-05', '2026-11-01']);
    expect(starts).toEqual([0, 2, 4]);
  });

  test('a short page ends the feed', () => {
    const starts: number[] = [];
    const filings = Effect.runSync(
      collectFilings(
        (start) =>
          Effect.sync(() => {
            starts.push(start);
            return start === 0 ? [{ accession: 'a', form: '4', filed: '2026-11-10', link: 'x' }] : [];
          }),
        '2026-01-01',
        2,
      ),
    );
    expect(filings).toHaveLength(1);
    expect(starts).toEqual([0]);
  });
});

describe('market data', () => {
  test('daily bars with returns, skipping a bar with no close', () => {
    const bars = parseChart('AAPL', CHART);
    expect(bars.map(({ date, values }) => [date, values.close, values.changePercent])).toEqual([
      ['2026-11-13', 184, undefined],
      ['2026-11-14', 182.16, -1],
    ]);
    expect(Obj.getMeta(bars[1]).keys).toEqual([{ source: 'query1.finance.yahoo.com', id: 'AAPL@2026-11-14' }]);
    const facts = observationFacts(bars[1]);
    expect(predicates(facts)).toEqual(
      expect.arrayContaining([MARKET.about.iri, MARKET.close.iri, MARKET.changePercent.iri, MARKET.observedOn.iri]),
    );
    // Deterministic: the same row writes the same statements.
    expect(observationFacts(bars[1]).map(({ id }) => id)).toEqual(facts.map(({ id }) => id));
  });

  test('the bar of a session still open is left out until it closes', () => {
    // 2026-11-16 14:30 to 21:00 UTC.
    const session = { start: 1794839400, end: 1794862800 };
    const chart = JSON.stringify({
      chart: {
        result: [
          {
            meta: { currentTradingPeriod: { regular: session } },
            timestamp: [1794753000, session.start],
            indicators: {
              quote: [{ open: [180, 182], high: [185, 186], low: [179, 180], close: [184, 183], volume: [1e6, 5e5] }],
            },
          },
        ],
      },
    });
    const dates = (now: number) => parseChart('AAPL', chart, now).map(({ date }) => date);
    expect(dates((session.start + 3600) * 1000)).toEqual(['2026-11-15']);
    expect(dates(session.end * 1000)).toEqual(['2026-11-15', '2026-11-16']);
  });

  test('FINRA short volume, kept for known listings', () => {
    const rows = parseShortVolume(
      'Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n20261113|AAPL|400|10|1000|B,Q,N\n20261113|ZZZZ|1|0|2|Q\n',
    );
    expect(rows.map(({ symbol, date, values }) => [symbol, date, values.shortRatio])).toEqual([
      ['AAPL', '2026-11-13', 0.4],
    ]);
  });
});

describe('House disclosures', () => {
  test('unzips stored and deflated entries', () => {
    for (const deflate of [false, true]) {
      const files = unzip(zip({ 'a.txt': 'hello', '2026FD.xml': HOUSE }, deflate));
      expect(new TextDecoder().decode(files.get('a.txt'))).toBe('hello');
      // TextDecoder drops the byte-order mark.
      expect(new TextDecoder().decode(files.get('2026FD.xml'))).toBe(HOUSE.slice(1));
    }
  });

  test('periodic transaction reports since a day', () => {
    const [filing, ...rest] = parseHouseIndex(HOUSE, 2026, '2026-10-16');
    expect(rest).toEqual([]);
    expect(Obj.getMeta(filing).keys).toEqual([{ source: 'disclosures-clerk.house.gov', id: '20031234' }]);
    expect(filing).toMatchObject({
      kind: 'congress-filing',
      date: '2026-11-03',
      link: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20031234.pdf',
      labels: { member: 'Jane Doe', district: 'CA12' },
    });
    expect(predicates(observationFacts(filing))).toContain(MARKET.disclosesTrades.iri);
  });
});
