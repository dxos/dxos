//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { XMLParser } from 'fast-xml-parser';
import { inflateRawSync } from 'node:zlib';

import { Finance } from '#types';

import { SourceError, getBytes } from './http.ts';

/** The foreign-key source of House financial-disclosure filings. */
export const HOUSE_SOURCE = 'disclosures-clerk.house.gov';

/**
 * The files of a zip archive by name, read through its central directory (sizes in local headers may be zero when
 * the writer streamed the archive). Stored and deflated entries only, which is all the House archive uses.
 */
export const unzip = (archive: Uint8Array): Map<string, Uint8Array> => {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  let end = archive.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) {
    end--;
  }
  if (end < 0) {
    throw new Error('Not a zip archive');
  }
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index++) {
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(archive.subarray(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = archive.subarray(start, start + size);
    files.set(name, method === 8 ? new Uint8Array(inflateRawSync(data)) : data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
};

const parser = new XMLParser({ parseTagValue: false, isArray: (name) => name === 'Member' });

/** `4/15/2026` as `2026-04-15`. */
const isoDay = (date: string): string | undefined => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date.trim());
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : undefined;
};

/**
 * The periodic transaction reports (filing type `P`) a year's House disclosure index lists, filed on or after `since`.
 * The trades themselves are in each report's PDF, which is not parsed; the filing records who disclosed trades when.
 */
export const parseHouseIndex = (xml: string, year: number, since: string): Finance.Observation[] => {
  const parsed: unknown = parser.parse(xml.replace(/^﻿/, ''));
  const members =
    parsed && typeof parsed === 'object' && 'FinancialDisclosure' in parsed
      ? Reflect.get(Object(parsed.FinancialDisclosure), 'Member')
      : [];
  return (Array.isArray(members) ? members : []).flatMap((member: Record<string, unknown>) => {
    const text = (key: string) => (typeof member[key] === 'string' ? String(member[key]).trim() : '');
    const date = isoDay(text('FilingDate'));
    if (text('FilingType') !== 'P' || !date || date < since || !text('DocID')) {
      return [];
    }
    const name = [text('First'), text('Last')].filter((part) => part.length > 0).join(' ');
    return [
      Finance.makeObservation({
        key: { source: HOUSE_SOURCE, id: text('DocID') },
        kind: 'congress-filing',
        issuer: name,
        date,
        link: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${text('DocID')}.pdf`,
        labels: { member: name, district: text('StateDst'), filingType: 'periodic transaction report' },
      }),
    ];
  });
};

/** The year's House periodic transaction reports filed on or after `since`. */
export const houseFilings = (year: number, since: string): Effect.Effect<Finance.Observation[], SourceError> =>
  getBytes(`https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`).pipe(
    Effect.flatMap((archive) =>
      Effect.try({
        try: () => {
          const xml = unzip(archive).get(`${year}FD.xml`);
          return xml ? parseHouseIndex(new TextDecoder().decode(xml), year, since) : [];
        },
        catch: (cause) => new SourceError({ message: 'Unrecognized House disclosure archive', cause }),
      }),
    ),
  );
