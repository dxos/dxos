//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, type Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { ExtractedFrom } from '../types';

/**
 * Returns the set of objects extracted from a given Message — i.e. the `Source` of every
 * `ExtractedFrom` relation whose `Target` is this message. Used by `MessageHeader` to render
 * a tag per extracted artifact (Trip, Person, Booking, …).
 *
 * The list updates reactively as new extractions land (via `ExtractMessage` dispatcher) or
 * existing extractions are deleted.
 */
export const useExtractedObjects = (
  db: Database.Database | undefined,
  message: Message.Message | Obj.Snapshot<Message.Message>,
): Obj.Any[] => {
  return useQuery(db, Query.select(Filter.id(message.id)).targetOf(ExtractedFrom.ExtractedFrom).source()) as Obj.Any[];
};
