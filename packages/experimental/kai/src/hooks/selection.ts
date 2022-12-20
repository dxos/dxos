//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { EchoDatabase, EchoObject } from '@dxos/echo-db2';

export const db = (object: EchoObject) => object._database;
export const id = (object: EchoObject) => object._id;
export const flush = (object: EchoObject) => db(object)!.save(object);

export type Predicate = { [key: string]: any };
export type Anchor = EchoDatabase | EchoObject | EchoObject[] | undefined;
export type Selector = Predicate;
export type Selection = {};

/**
 * Query for objects.
 */
export const useObjects = (selector: Selector): EchoObject[] => {
  const [objects, setObjects] = useState<EchoObject[]>([]);

  return objects;
};

/**
 * Create reactive selection.
 */
export const useSelection = (): Selection => ({});
