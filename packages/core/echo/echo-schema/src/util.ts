//
// Copyright 2022 DXOS.org
//

export const isReferenceLike = (value: any): value is { '@id': string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.getOwnPropertyNames(value).length === 1 &&
  typeof (value as any)['@id'] === 'string';
