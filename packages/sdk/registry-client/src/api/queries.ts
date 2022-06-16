//
// Copyright 2021 DXOS.org
//

import { CID } from './cid';
import { DXN } from './dxn';
import { Resource } from './registry';
import { RegistryRecord } from './registry-client';

/**
 * Common querying request for data of the DXNS.
 */
export interface Query {
  /**
   * Query by record type. Will only return data records.
   */
  type?: CID,

  /**
   * Query by specific string appearing in record's text fields.
   */
  text?: string
}

/**
 * Filtering logic in query-like methods of the API.
 */
export const Filtering = {
  /**
   * Returns true if the item matches the query specification. False otherwise.
   *
   * @param query specifies the querying conditions.
   * @param resource undergoes query conditions examination.
   */
  matchResource (resource: Resource, query?: Query): boolean {
    if (!query) {
      return true;
    }

    const textMatches = query.text === undefined || matchesDxn(resource.name, query.text);
    const typeMatches = query.type === undefined || (!!resource.type && resource.type.equals(query.type));

    return textMatches && typeMatches;
  },

  /**
   * Returns true if the item matches the query specification. False otherwise.
   *
   * @param query specifies the querying conditions.
   * @param record undergoes query conditions examination.
   */
  matchRecord (record: RegistryRecord, query?: Query): boolean {
    if (!query) {
      return true;
    }

    const textMatches = query.text === undefined || matchesText(record, query.text);
    const typeMatches = query.type === undefined || matchesRecordType(record, query.type);

    return textMatches && typeMatches;
  }
};

function matchesRecordType (record: RegistryRecord, type: CID) {
  if (!record.payload['@type']) {
    return false;
  }

  return CID.from(record.payload['@type']).equals(type);
}

function matchesText (record: RegistryRecord, text: string) {
  const places = [
    record.displayName ?? '',
    record.description ?? '',
    ...(record.tags ?? [])
  ];
  return places.some(place => place.toLowerCase().includes(text.toLowerCase()));
}

function matchesDxn (dxn: DXN, text: string): boolean {
  return dxn.toString().toLowerCase().indexOf(text.toLowerCase()) >= 0;
}
