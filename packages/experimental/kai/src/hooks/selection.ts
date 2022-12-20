//
// Copyright 2022 DXOS.org
//

import { EchoObject } from '@dxos/echo-db2';

export const id = (object: EchoObject) => object._id;

type Predicate = { [key: string]: any };
// type Anchor = EchoDatabase | EchoObject | EchoObject[] | undefined;
type Selector = Predicate;

export const useObjects = (selector: Selector): EchoObject[] => [];

export const useSelection = () => {};
