//
// Copyright 2024 DXOS.org
//

import { expect, describe, test } from 'vitest';

import { type LayoutParts, type LayoutAdjustment, type LayoutEntry } from '@dxos/app-framework';

import { uriToActiveParts, activePartsToUri, incrementPlank, mergeLayoutParts, openEntry } from './layout';

describe('Layout URI parsing and formatting', () => {
  test('uriToActiveParts parses a simple URI correctly', () => {
    const uri = 'https://composer.space/main-id1~path1+id2_sidebar-id3';
    const result = uriToActiveParts(uri);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
      sidebar: [{ id: 'id3' }],
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

  test('activePartsToUri handles complex cases with multiple parts, and simple paths', () => {
    const complexActiveParts: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }, { id: 'id3', path: 'path3' }],
      sidebar: [{ id: 'id4' }, { id: 'id5', path: 'path5' }],
      complementary: [{ id: 'id6', path: 'path6' }, { id: 'id7' }],
    };
    const result = activePartsToUri(complexActiveParts);
    expect(result).to.equal('main-id1~path1+id2+id3~path3_sidebar-id4+id5~path5_complementary-id6~path6+id7');
  });

  test('Round trip: URI to object and back to URI', () => {
    const originalUri = 'main-id1~path1+id2_sidebar-id3_complementary-id4~path4';
    const activeParts = uriToActiveParts(originalUri);
    const resultUri = activePartsToUri(activeParts);
    expect(resultUri).to.equal(originalUri);
  });

  test('Round trip: object to URI and back to object', () => {
    const originalParts: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
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
      layoutCoordinate: { part: 'main', entryId: 'id2' },
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
      layoutCoordinate: { part: 'main', entryId: 'id2' },
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
      layoutCoordinate: { part: 'sidebar', entryId: 'sid2' },
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
      layoutCoordinate: { part: 'main', entryId: 'id1' },
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
      layoutCoordinate: { part: 'main', entryId: 'id2' },
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
      layoutCoordinate: { part: 'main', entryId: 'id3' },
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
      layoutCoordinate: { part: 'main', entryId: 'id2' },
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
      layoutCoordinate: { part: 'main', entryId: 'id1' },
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
      layoutCoordinate: { part: 'main', entryId: 'id1' },
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
      layoutCoordinate: { part: 'main', entryId: 'id1' },
      type: 'increment-end',
    };
    const result = incrementPlank(layout, adjustment);
    expect(result).to.deep.equal(layout);
  });
});

describe('Layout parts merging', () => {
  test('merges two simple layout parts', () => {
    const part1: LayoutParts = { main: [{ id: 'id1' }] };
    const part2: LayoutParts = { sidebar: [{ id: 'id2' }] };
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }],
      sidebar: [{ id: 'id2' }],
    });
  });

  test('replaces entries with the same id in the same part', () => {
    const part1: LayoutParts = { main: [{ id: 'id1', path: 'path1' }] };
    const part2: LayoutParts = { main: [{ id: 'id1', path: 'path2' }] };
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path2' }],
    });
  });

  test('merges multiple layout parts', () => {
    const part1: LayoutParts = { main: [{ id: 'id1' }] };
    const part2: LayoutParts = { sidebar: [{ id: 'id2' }] };
    const part3: LayoutParts = { complementary: [{ id: 'id3' }] };
    const result = mergeLayoutParts(part1, part2, part3);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }],
      sidebar: [{ id: 'id2' }],
      complementary: [{ id: 'id3' }],
    });
  });

  test('handles empty layout parts', () => {
    const part1: LayoutParts = { main: [{ id: 'id1' }] };
    const part2: LayoutParts = {};
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }],
    });
  });

  test('merges parts with multiple entries', () => {
    const part1: LayoutParts = { main: [{ id: 'id1' }, { id: 'id2' }] };
    const part2: LayoutParts = { main: [{ id: 'id3' }], sidebar: [{ id: 'id4' }] };
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }, { id: 'id2' }, { id: 'id3' }],
      sidebar: [{ id: 'id4' }],
    });
  });

  test('replaces entries with the same id and keeps unique entries', () => {
    const part1: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
      sidebar: [{ id: 'id3' }],
    };
    const part2: LayoutParts = {
      main: [{ id: 'id1', path: 'path2' }, { id: 'id4' }],
      complementary: [{ id: 'id5' }],
    };
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path2' }, { id: 'id2' }, { id: 'id4' }],
      sidebar: [{ id: 'id3' }],
      complementary: [{ id: 'id5' }],
    });
  });

  test('merges complex layout parts', () => {
    const part1: LayoutParts = {
      main: [{ id: 'id1', path: 'path1' }, { id: 'id2' }],
      sidebar: [{ id: 'id3' }],
    };
    const part2: LayoutParts = {
      main: [{ id: 'id1', path: 'path2' }, { id: 'id4' }],
      complementary: [{ id: 'id5' }],
    };
    const part3: LayoutParts = {
      sidebar: [{ id: 'id6' }],
      fullScreen: [{ id: 'id7' }],
    };
    const result = mergeLayoutParts(part1, part2, part3);
    expect(result).to.deep.equal({
      main: [{ id: 'id1', path: 'path2' }, { id: 'id2' }, { id: 'id4' }],
      sidebar: [{ id: 'id3' }, { id: 'id6' }],
      complementary: [{ id: 'id5' }],
      fullScreen: [{ id: 'id7' }],
    });
  });

  test('handles merging with duplicate entries in the same part', () => {
    const part1: LayoutParts = {
      main: [{ id: 'id1' }, { id: 'id1' }, { id: 'id2' }],
    };
    const result = mergeLayoutParts(part1);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }, { id: 'id2' }],
    });
  });

  test('preserves order of entries when merging', () => {
    const part1: LayoutParts = { main: [{ id: 'id1' }, { id: 'id2' }] };
    const part2: LayoutParts = { main: [{ id: 'id3' }, { id: 'id1' }] };
    const result = mergeLayoutParts(part1, part2);
    expect(result).to.deep.equal({
      main: [{ id: 'id1' }, { id: 'id2' }, { id: 'id3' }],
    });
  });
});

describe('openEntry', () => {
  const initialLayout: LayoutParts = {
    main: [
      { id: 'id1', path: 'path1' },
      { id: 'id2', path: 'path2' },
      { id: 'id3', path: 'path3' },
    ],
    sidebar: [{ id: 'sid1', path: 'sidepath1' }],
  };

  const newEntry: LayoutEntry = { id: 'new', path: 'newpath' };

  test('adds entry to start of main without pivot', () => {
    const result = openEntry(initialLayout, 'main', newEntry, { positioning: 'start' });
    expect(result.main?.[0]).to.deep.equal(newEntry);
    expect(result.main?.length).to.equal(4);
  });

  test('adds entry to end of main without pivot', () => {
    const result = openEntry(initialLayout, 'main', newEntry, { positioning: 'end' });
    expect(result.main?.[result.main.length - 1]).to.deep.equal(newEntry);
    expect(result.main?.length).to.equal(4);
  });

  test('adds entry before pivot in main', () => {
    const result = openEntry(initialLayout, 'main', newEntry, { positioning: 'start', pivotId: 'id2' });
    expect(result.main?.[1]).to.deep.equal(newEntry);
    expect(result.main?.length).to.equal(4);
  });

  test('adds entry after pivot in main', () => {
    const result = openEntry(initialLayout, 'main', newEntry, { positioning: 'end', pivotId: 'id2' });
    expect(result.main?.[2]).to.deep.equal(newEntry);
    expect(result.main?.length).to.equal(4);
  });

  test('adds entry to start when pivot is not found', () => {
    const result = openEntry(initialLayout, 'main', newEntry, { positioning: 'start', pivotId: 'nonexistent' });
    expect(result.main?.[0]).to.deep.equal(newEntry);
    expect(result.main?.length).to.equal(4);
  });

  test('does not add duplicate entry to main', () => {
    const result = openEntry(initialLayout, 'main', initialLayout.main![0], { positioning: 'start' });
    expect(result.main).to.deep.equal(initialLayout.main);
  });

  test('replaces entry in non-main part', () => {
    const result = openEntry(initialLayout, 'sidebar', newEntry);
    expect(result.sidebar).to.deep.equal([newEntry]);
  });

  test('creates new part if it does not exist', () => {
    const result = openEntry(initialLayout, 'complementary', newEntry);
    expect(result.complementary).to.deep.equal([newEntry]);
  });

  test('handles undefined main part', () => {
    const layoutWithoutMain: LayoutParts = { sidebar: [{ id: 'sid1', path: 'sidepath1' }] };
    const result = openEntry(layoutWithoutMain, 'main', newEntry);
    expect(result.main).to.deep.equal([newEntry]);
  });
});
