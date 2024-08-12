//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { uriToActiveParts, activePartsToUri, type LayoutParts, type LayoutAdjustment, incrementPlank } from './Layout';

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

describe('Layout adjustment', () => {
  test('adjustLayout moves an item left in the main part', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }, { id: 'id3' }],
      sidebar: [{ id: 'sid1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id2' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result.main).to.deep.equal([{ id: 'id2' }, { id: 'id1' }, { id: 'id3' }]);
    expect(result.sidebar).to.deep.equal([{ id: 'sid1' }]);
  });

  test('adjustLayout moves an item right in the main part', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }, { id: 'id3' }],
      sidebar: [{ id: 'sid1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id2' },
      type: 'increment-end',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result.main).to.deep.equal([{ id: 'id1' }, { id: 'id3' }, { id: 'id2' }]);
    expect(result.sidebar).to.deep.equal([{ id: 'sid1' }]);
  });

  test('adjustLayout does not move items in non-main parts', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }],
      sidebar: [{ id: 'sid1' }, { id: 'sid2' }, { id: 'sid3' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'sidebar', slugId: 'sid2' },
      type: 'increment-end',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout does not move the first item left in main', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id1' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout does not move the last item right in main', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id2' },
      type: 'increment-end',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout handles non-existent slugId in main', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id3' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout preserves other parts when adjusting main', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id2' }],
      sidebar: [{ id: 'sid1' }],
      complementary: [{ id: 'cid1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id2' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result.main).to.deep.equal([{ id: 'id2' }, { id: 'id1' }]);
    expect(result.sidebar).to.deep.equal([{ id: 'sid1' }]);
    expect(result.complementary).to.deep.equal([{ id: 'cid1' }]);
  });

  test('adjustLayout handles empty main part', () => {
    const layout: LayoutParts = {
      main: [],
      sidebar: [{ id: 'sid1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id1' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout handles undefined main part', () => {
    const layout: LayoutParts = {
      sidebar: [{ id: 'sid1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id1' },
      type: 'increment-start',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });

  test('adjustLayout handles main part with only one item', () => {
    const layout: LayoutParts = {
      main: [{ id: 'id1' }],
    };
    const adjustment: LayoutAdjustment = {
      layoutCoordinate: { part: 'main', slugId: 'id1' },
      type: 'increment-end',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });
});
