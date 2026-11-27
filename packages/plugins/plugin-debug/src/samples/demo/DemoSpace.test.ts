//
// Copyright 2026 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { DATA_CENTERS } from './data-centers.ts';
import * as DemoSpace from './DemoSpace.ts';
import { GAMES } from './games.ts';
import { TOUR } from './map.ts';
import { creeper } from './sculpture.ts';
import { TOWN, town } from './town.ts';
import { VEHICLES } from './vehicles.ts';

describe('Demo template', () => {
  test('every game is legal to its last move and in the stage it claims', ({ expect }) => {
    expect(GAMES).toHaveLength(16);
    const stages = new Set(GAMES.map((game) => game.stage));
    expect([...stages].sort()).toEqual(['endgame', 'finished', 'middlegame', 'opening']);
    for (const game of GAMES) {
      const chess = new ChessJS();
      if (game.pgn) {
        // `loadPgn` throws on the first illegal move, so a typo cannot leave a game silently truncated.
        chess.loadPgn(game.pgn);
        const moves = game.pgn
          .replace(/\d+\.\s*/g, '')
          .split(/\s+/)
          .filter((token) => !/^(\*|1-0|0-1|1\/2-1\/2)$/.test(token));
        expect(chess.history(), game.name).toHaveLength(moves.length);
      } else {
        expect(game.fen, game.name).toBeDefined();
        chess.load(game.fen ?? '');
      }
      expect(chess.isGameOver(), game.name).toBe(game.stage === 'finished');
    }
  });

  test('every data centre has a distinct code and a location on the globe', ({ expect }) => {
    expect(DATA_CENTERS.length).toBeGreaterThan(300);
    expect(new Set(DATA_CENTERS.map(([code]) => code)).size).toBe(DATA_CENTERS.length);
    for (const [code, , lng, lat] of DATA_CENTERS) {
      expect(Math.abs(lng), code).toBeLessThanOrEqual(180);
      expect(Math.abs(lat), code).toBeLessThanOrEqual(90);
    }
  });

  test('builds the games and a map pinned on every data centre', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(DemoSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.game:')).toBe(16);
    expect(countOf('type.chess.state')).toBe(16);
    expect(countOf('type.map')).toBe(1);
    expect(countOf('type.organization')).toBe(DATA_CENTERS.length);
    expect(countOf('type.voxel')).toBe(2);
    // The 3D canvas: three race cars and a fire truck placing two preset meshes, each defined once in its model.
    expect(countOf('type.scene.scene3d')).toBe(1);
    expect(countOf('type.scene.model3d')).toBe(1);
    expect(VEHICLES.filter(({ preset }) => preset === 'race')).toHaveLength(3);
    expect(VEHICLES.filter(({ preset }) => preset === 'firetruck')).toHaveLength(1);

    // The map's view pivots on the organizations' location, which is what the map plots.
    const {
      objects,
    }: {
      objects: Array<{
        '@type'?: string;
        'projection'?: { pivotFieldId?: string; fields?: Array<{ id: string; path: string }> };
        'coordinates'?: number[][];
        'description'?: string;
        'objects'?: Record<string, { kind?: string; props?: { mesh?: { indices?: number[] } } }>;
        'elements'?: Record<string, { object?: string }>;
        'name'?: string;
        'voxels'?: Record<string, { hue: string }>;
      }>;
    } = JSON.parse(json);
    // Each preset is stored once with its parsed geometry, and every vehicle places one, so the canvas renders as is.
    const model = objects.find((object) => object['@type']?.includes('type.scene.model3d'));
    const meshes = Object.values(model?.objects ?? {});
    expect(meshes.map(({ kind }) => kind)).toEqual(['mesh', 'mesh']);
    expect(meshes.every(({ props }) => (props?.mesh?.indices?.length ?? 0) > 300)).toBe(true);
    const layout = objects.find((object) => object['@type']?.includes('type.scene.layout3d'));
    // An archived record keeps its keys, not their order.
    expect(
      Object.values(layout?.elements ?? {})
        .map(({ object }) => object)
        .sort(),
    ).toEqual(VEHICLES.map(({ preset }) => preset).sort());
    // Every game's description is its current position, which the Games table shows as a column.
    const descriptions = objects
      .filter((object) => object['@type']?.includes('type.game:'))
      .map((game) => game.description);
    expect(descriptions).toHaveLength(16);
    expect(descriptions.every((fen) => typeof fen === 'string' && fen.split(' ').length === 6)).toBe(true);
    expect(descriptions).toContain('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    const view = objects.find((object) => object['@type']?.includes('type.view'));
    const pivot = view?.projection?.fields?.find((field) => field.id === view.projection?.pivotFieldId);
    expect(pivot?.path).toBe('location');

    // The map carries its globe tour as coordinates, one per stop and in order.
    const map = objects.find((object) => object['@type']?.includes('type.map'));
    const coordinates = map?.coordinates;
    expect(coordinates).toHaveLength(TOUR.length);
    const la = DATA_CENTERS.find(([code]) => code === 'LAX');
    expect(coordinates?.[0]).toEqual([la?.[2], la?.[3]]);

    // Every voxel generated survives the archive, so the worlds hold what the generators drew.
    const voxelCount = (name: string) =>
      Object.keys(objects.find((object) => object.name === name)?.voxels ?? {}).length;
    expect(voxelCount('Creeper')).toBe(creeper().length);
    expect(voxelCount('Town')).toBe(town().length);
  });

  test('the creeper stands on a grass block with its face on the front', ({ expect }) => {
    const voxels = creeper();
    expect(voxels.length).toBeGreaterThan(800);
    const hues = new Set(voxels.map((voxel) => voxel.hue));
    expect([...hues]).toEqual(expect.arrayContaining(['green', 'lime', 'amber', 'neutral']));
    // Two eyes of four pixels and a mouth of twelve.
    expect(voxels.filter((voxel) => voxel.hue === 'neutral')).toHaveLength(20);
    // Ground, legs, body and an eight-voxel head stacked up.
    expect(Math.max(...voxels.map((voxel) => voxel.z))).toBe(28);
  });

  test('the town has three racing cars, a fire truck and its buildings, none overlapping', ({ expect }) => {
    const ofKind = (kind: string) => TOWN.filter((part) => part.kind === kind);
    const cars = ofKind('car');
    expect(cars).toHaveLength(3);
    expect(new Set(cars.map((car) => car.hue)).size).toBe(3);
    expect(ofKind('fire-truck').map((truck) => truck.hue)).toEqual(['red']);
    expect(ofKind('house').length + ofKind('tower').length).toBeGreaterThanOrEqual(4);

    // No two parts claim the same cell, or the merge would silently repaint one with the other.
    const cells = new Map<string, string>();
    for (const part of TOWN) {
      for (const { x, y, z } of part.voxels) {
        const key = `${x}:${y}:${z}`;
        expect(cells.get(key), `${part.name} overlaps at ${key}`).toBeUndefined();
        cells.set(key, part.name);
      }
    }
    expect(town().length).toBeGreaterThan(1_000);
  });
});
