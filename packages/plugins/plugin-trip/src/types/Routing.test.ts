//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Routing from './Routing.ts';

describe('Routing', () => {
  test('MissingApiKeyError carries the service id', ({ expect }) => {
    const error = new Routing.MissingApiKeyError('mapbox');
    expect(error.serviceId).toBe('mapbox');
    expect(error).toBeInstanceOf(Error);
  });

  test('GeocodeError carries the location it could not resolve', ({ expect }) => {
    const error = new Routing.GeocodeError('Ultima Thule');
    expect(error.location).toBe('Ultima Thule');
    expect(error.message).toContain('Ultima Thule');
  });

  test('isFailure matches every routing failure and nothing else', ({ expect }) => {
    expect(Routing.isFailure(new Routing.MissingApiKeyError('mapbox'))).toBe(true);
    expect(Routing.isFailure(new Routing.GeocodeError('Ultima Thule'))).toBe(true);
    expect(Routing.isFailure(new Routing.RouteError('no route'))).toBe(true);
    expect(Routing.isFailure(new Error('boom'))).toBe(false);
    expect(Routing.isFailure(undefined)).toBe(false);
  });
});
