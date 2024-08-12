//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { uriToActiveParts, activePartsToUri, type LayoutParts } from './Layout';

describe('Layout URI parsing and formatting', () => {
  test('uriToActiveParts parses a simple URI correctly', () => {
    const uri = 'https://composer.space/main-id1~path1+id2_sidebar-id3';
    const result = uriToActiveParts(uri);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
      sidebar: [{ id: 'id3' }],
    });
  });

  test('uriToActiveParts handles solo indicators', () => {
    const uri = 'https://composer.space/main-$id1~path1_sidebar-id2';
    const result = uriToActiveParts(uri);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path1', solo: true }],
      sidebar: [{ id: 'id2' }],
    });
  });

  test('activePartsToUri formats a simple object correctly', () => {
    const activeParts: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
      sidebar: [{ id: 'id3' }],
    };
    const result = activePartsToUri(activeParts);
    expect(result).to.equal('main-id1~path1+id2_sidebar-id3');
  });

  test('activePartsToUri handles solo indicators', () => {
    const activeParts: LayoutParts = {
      main: [{ id: 'id1', path: 'path1', solo: true }],
      sidebar: [{ id: 'id2' }],
    };
    const result = activePartsToUri(activeParts);
    expect(result).to.equal('main-$id1~path1_sidebar-id2');
  });

  test('activePartsToUri handles complex cases with multiple parts, solo indicators, and simple paths', () => {
    const complexActiveParts: LayoutParts = {
      main: [
        { id: 'id1', path: 'path1' },
        { id: 'id2', solo: true },
        { id: 'id3', path: 'path3' },
      ],
      sidebar: [{ id: 'id4' }, { id: 'id5', solo: true, path: 'path5' }],
      complementary: [
        { id: 'id6', path: 'path6' },
        { id: 'id7', solo: true },
      ],
    };
    const result = activePartsToUri(complexActiveParts);
    expect(result).to.equal('main-id1~path1+$id2+id3~path3_sidebar-id4+$id5~path5_complementary-id6~path6+$id7');
  });

  test('Round trip: URI to object and back to URI', () => {
    const originalUri = 'main-id1~path1+$id2_sidebar-id3_complementary-id4~path4';
    const activeParts = uriToActiveParts(originalUri);
    const resultUri = activePartsToUri(activeParts);
    expect(resultUri).to.equal(originalUri);
  });

  test('Round trip: object to URI and back to object', () => {
    const originalParts: LayoutParts = {
      main: [
        { id: 'id1', path: 'path1' },
        { id: 'id2', solo: true },
      ],
      sidebar: [{ id: 'id3' }],
      complementary: [{ id: 'id4', path: 'path4' }],
    };
    const uri = activePartsToUri(originalParts);
    const resultParts = uriToActiveParts(`https://composer.space/${uri}`);
    expect(resultParts).to.deep.equal(originalParts);
  });

  test('uriToActiveParts handles missing parts', () => {
    const uri = 'https://composer.space/main-id1~path1_sidebar-id2';
    const result = uriToActiveParts(uri);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path1' }],
      sidebar: [{ id: 'id2' }],
    });
  });

  test('activePartsToUri excludes empty parts', () => {
    const activeParts: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }],
    };
    const result = activePartsToUri(activeParts);
    expect(result).to.equal('main-id1~path1');
  });
});
