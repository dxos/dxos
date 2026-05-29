//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { Annotation } from '@dxos/echo';
import { getProperties } from '@dxos/effect';

import { Place } from './Place';
import * as Segment from './Segment';

describe('Segment schemas', () => {
  test('transport variants extend the shared TransportFields', ({ expect }) => {
    // `Schema.extend` merges the shared transport fields with each variant's own fields,
    // producing a traversable type literal that the form layout can resolve against.
    const names = getProperties(Segment.FlightDetails.ast).map((prop) => String(prop.name));
    expect(names).toEqual(expect.arrayContaining(['_tag', 'origin', 'destination', 'departAt', 'arriveAt', 'number']));
    // Flight-specific fields are present too.
    expect(names).toEqual(expect.arrayContaining(['terminalFrom', 'gateFrom']));

    // Train carries the shared fields plus its own.
    const trainNames = getProperties(Segment.TrainDetails.ast).map((prop) => String(prop.name));
    expect(trainNames).toEqual(expect.arrayContaining(['origin', 'destination', 'platform', 'coach']));
  });

  test('discriminated union still resolves the variant kind', ({ expect }) => {
    const flight = Segment.makeDefault('flight');
    expect(Segment.getKind(flight)).toBe('flight');
    const train = Segment.makeDefault('train');
    expect(Segment.getKind(train)).toBe('train');
  });

  test('Place carries a LabelAnnotation resolving to its name', ({ expect }) => {
    expect(Option.getOrUndefined(Annotation.LabelAnnotation.get(Place))).toEqual(['name']);
    const label = Annotation.getLabelWithSchema(Place, { name: 'John F. Kennedy Intl', code: 'JFK' });
    expect(label).toBe('John F. Kennedy Intl');
  });
});
