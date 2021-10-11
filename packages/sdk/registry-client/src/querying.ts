//
// Copyright 2021 DXOS.org
//

import { DXN } from './dxn';
import { CID } from './models';
import { RegistryRecord, Resource } from './registry-client';

/**
 * Common querying request for data of the DXNS.
 */
export interface IQuery {
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
  matchResource (resource: Resource, query?: IQuery): boolean {
    if (!query) {
      return true;
    }

    const textMatches = query.text === undefined || matchesDxn(resource.id, query.text);
    const typeMatches = query.type === undefined || (!!resource.type && resource.type.equals(query.type));

    return textMatches && typeMatches;
  },

  /**
   * Returns true if the item matches the query specification. False otherwise.
   *
   * @param query specifies the querying conditions.
   * @param record undergoes query conditions examination.
   */
  matchRecord (record: RegistryRecord, query?: IQuery): boolean {
    if (!query) {
      return true;
    }

    return query.type === undefined || matchesRecordType(record, query.type);
  }

};

function matchesRecordType (record: RegistryRecord, type: CID) {
  return RegistryRecord.isDataRecord(record) && record.type.equals(type);
}

function matchesDxn (dxn: DXN, text: string): boolean {
  return dxn.toString().toLowerCase().indexOf(text.toLowerCase()) >= 0;
}
