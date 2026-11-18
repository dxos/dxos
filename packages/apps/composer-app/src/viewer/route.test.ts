//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { composerOriginOf, failureMessage, parseRoute } from './route.ts';

const OBJECT_PATH = 'db/org.dxos.type.document+01ABC';

describe('parseRoute', () => {
  test('a shared link carries the public id in the workspace segment', ({ expect }) => {
    expect(parseRoute({ pathname: `/pub-1/${OBJECT_PATH}`, search: '' })).toEqual({
      publicId: 'pub-1',
      objectPath: OBJECT_PATH,
    });
    expect(parseRoute({ pathname: '/pub-1', search: '' })).toEqual({ publicId: 'pub-1', objectPath: undefined });
  });

  test('after import the public id is read from ?p and the path from the workspace URL', ({ expect }) => {
    expect(parseRoute({ pathname: `/w/SPACE/${OBJECT_PATH}`, search: '?p=pub-1' })).toEqual({
      publicId: 'pub-1',
      objectPath: OBJECT_PATH,
    });
  });

  test('the bare viewer origin names no publication', ({ expect }) => {
    expect(parseRoute({ pathname: '/', search: '' })).toBeUndefined();
  });
});

describe('composerOriginOf', () => {
  test('forks go to the app host the viewer sits behind', ({ expect }) => {
    expect(composerOriginOf('https://view.dev.composer.space')).toBe('https://dev.composer.space');
    expect(composerOriginOf('https://view.composer.space')).toBe('https://composer.space');
    expect(composerOriginOf('http://view.localhost:5173')).toBe('http://localhost:5173');
  });
});

describe('failureMessage', () => {
  test('only a missing archive says the space is no longer published', ({ expect }) => {
    expect(failureMessage(404)).toBe('This space is no longer published.');
    expect(failureMessage(503)).not.toBe(failureMessage(404));
    expect(failureMessage()).toBe(failureMessage(503));
  });
});
