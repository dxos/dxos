//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { type Place } from '../types/Place';
import { Segment, Trip, TripOperation } from '../types';

export default TripOperation.AddSegment.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ trip: tripRef, kind, title, origin, destination, departAt, arriveAt, notes }) {
      const trip = yield* Database.load(tripRef);
      const db = Obj.getDatabase(trip);
      invariant(db, 'Trip is not attached to a database.');

      const segment = Segment.make({ details: buildDetails({ kind, title, origin, destination, departAt, arriveAt }), notes });
      db.add(segment);
      Trip.addSegment(trip, segment);

      return { segmentId: segment.id };
    }),
  ),
  Operation.opaqueHandler,
);

type DetailsInput = {
  kind: Segment.Kind;
  title?: string;
  origin?: string;
  destination?: string;
  departAt?: string;
  arriveAt?: string;
};

const place = (name?: string): Place | undefined => (name ? { name } : undefined);

/** Maps the flat tool input onto the discriminated Segment `details` variant for the given kind. */
const buildDetails = ({ kind, title, origin, destination, departAt, arriveAt }: DetailsInput): Segment.Details => {
  switch (kind) {
    case 'accommodation':
      return {
        _tag: 'accommodation',
        propertyName: title,
        location: place(origin),
        checkIn: departAt,
        checkOut: arriveAt,
      };
    case 'activity':
      return { _tag: 'activity', title, venue: place(origin), departAt, arriveAt };
    case 'road':
      return { _tag: 'road', subKind: 'car', origin: place(origin), destination: place(destination), departAt, arriveAt };
    case 'flight':
    case 'train':
    case 'boat':
      return { _tag: kind, origin: place(origin), destination: place(destination), departAt, arriveAt };
  }
};
