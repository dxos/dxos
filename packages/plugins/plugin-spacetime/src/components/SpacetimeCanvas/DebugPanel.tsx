//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';
import React from 'react';

const n = (value: number, decimals = 2) => value.toFixed(decimals);

const containerClasses = 'absolute right-2 top-2 bottom-2 flex flex-col pointer-events-none';
const gridClasses =
  'grid grid-cols-4 [&_label]:text-right [&_label]:text-green-800 [&_p]:text-right [&_p]:text-green-600 bg-black/50 overflow-y-auto text-xs font-mono pointer-events-auto';

type StatsDebugInfo = {
  type: 'stats';
  entries: Record<string, string | number>;
};

type SolidDebugInfo = {
  type: 'solid';
  tris: number;
  volume: number;
  verts: Array<{ idx: number; x: number; y: number; z: number }>;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  position?: [number, number, number];
};

export type DebugInfo = StatsDebugInfo | SolidDebugInfo | null;

/** Debug overlay panel showing solid geometry or tool stats. */
export const DebugPanel = ({ info }: { info: DebugInfo }) => {
  if (!info) {
    return null;
  }

  if (info.type === 'stats') {
    return (
      <div className={containerClasses}>
        <div className={gridClasses}>
          {Object.entries(info.entries).map(([key, value]) => (
            <div key={key} className='col-span-full grid grid-cols-subgrid gap-2'>
              <label>{key}</label>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={gridClasses}>
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label>tris</label>
          <p>{info.tris}</p>
        </div>
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label>verts</label>
          <p>{info.verts.length}</p>
        </div>
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label>vol</label>
          <p>{n(info.volume, 1)}</p>
        </div>
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label>min</label>
          <p>{n(info.bbox.min[0], 1)}</p>
          <p>{n(info.bbox.min[1], 1)}</p>
          <p>{n(info.bbox.min[2], 1)}</p>
        </div>
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label>max</label>
          <p>{n(info.bbox.max[0], 1)}</p>
          <p>{n(info.bbox.max[1], 1)}</p>
          <p>{n(info.bbox.max[2], 1)}</p>
        </div>
        {info.position && (
          <div className='col-span-full grid grid-cols-subgrid gap-2'>
            <label>pos</label>
            <p>{n(info.position[0], 1)}</p>
            <p>{n(info.position[1], 1)}</p>
            <p>{n(info.position[2], 1)}</p>
          </div>
        )}
        <div className='col-span-full grid grid-cols-subgrid gap-2'>
          <label />
          <label>x</label>
          <label>y</label>
          <label>z</label>
        </div>
        {info.verts.map((v, i) => (
          <div key={i} className='col-span-full grid grid-cols-subgrid gap-2'>
            <label>{v.idx}</label>
            <p>{n(v.x)}</p>
            <p>{n(v.y)}</p>
            <p>{n(v.z)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Extracts debug info from a Manifold solid. */
export const extractSolidDebugInfo = (solid: Manifold, position?: [number, number, number]): SolidDebugInfo => {
  const mesh = solid.getMesh();
  const { vertProperties, triVerts, numProp, numTri } = mesh;

  const seen = new Set<number>();
  const verts: SolidDebugInfo['verts'] = [];
  for (let tri = 0; tri < numTri; tri++) {
    for (let vi = 0; vi < 3; vi++) {
      const idx = triVerts[tri * 3 + vi];
      if (!seen.has(idx)) {
        seen.add(idx);
        verts.push({
          idx,
          x: vertProperties[idx * numProp],
          y: vertProperties[idx * numProp + 1],
          z: vertProperties[idx * numProp + 2],
        });
      }
    }
  }
  verts.sort((a, b) => a.idx - b.idx);

  const bbox = solid.boundingBox();
  return {
    type: 'solid',
    tris: numTri,
    verts,
    volume: solid.volume(),
    bbox: {
      min: [bbox.min[0], bbox.min[1], bbox.min[2]],
      max: [bbox.max[0], bbox.max[1], bbox.max[2]],
    },
    position,
  };
};
