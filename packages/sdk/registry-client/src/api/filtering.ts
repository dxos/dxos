//
// Copyright 2021 DXOS.org
//

import { CID } from './cid';
import { DXN } from './dxn';
import { RegistryRecord } from './registry-client';

/**
 * Filters to apply to lists of data from DXNS.
 */
export interface Filter {
  /**
   * Filter by record type. Will only return data records.
   */
  type?: CID;

  /**
   * Filter by specific string appearing in record's text fields.
   */
  text?: string;
}

/**
 * Filtering logic in list methods of the API.
 */
export const Filtering = {
  /**
   * Returns true if the item matches the filter specification. False otherwise.
   *
   * @param name undergoes filter conditions examination.
   * @param filter specifies the filter conditions.
   */
  matchResource: (name: DXN, filter?: Filter): boolean => {
    if (!filter) {
      return true;
    }

    const textMatches =
      filter.text === undefined || matchesDxn(name, filter.text);

    return textMatches;
  },

  /**
   * Returns true if the item matches the filter specification. False otherwise.
   *
   * @param filter specifies the filter conditions.
   * @param record undergoes filter conditions examination.
   */
  matchRecord: (record: RegistryRecord, filter?: Filter): boolean => {
    if (!filter) {
      return true;
    }

    const textMatches =
      filter.text === undefined || matchesText(record, filter.text);
    const typeMatches =
      filter.type === undefined || matchesRecordType(record, filter.type);

    return textMatches && typeMatches;
  }
};

const matchesRecordType = (record: RegistryRecord, type: CID) => {
  if (!record.payload['@type']) {
    return false;
  }

  return CID.from(record.payload['@type']).equals(type);
};

const matchesText = (record: RegistryRecord, text: string) => {
  const places = [
    record.displayName ?? '',
    record.description ?? '',
    ...(record.tags ?? [])
  ];
  return places.some((place) =>
    place.toLowerCase().includes(text.toLowerCase())
  );
};

const matchesDxn = (dxn: DXN, text: string): boolean =>
  dxn.toString().toLowerCase().indexOf(text.toLowerCase()) >= 0;
