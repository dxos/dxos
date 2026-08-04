//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';
import React from 'react';

import { extractSolidDebugInfo } from './solid-debug-info';

const n = (value: number, decimals = 2) => value.toFixed(decimals);

const styles = {
  container: 'absolute right-2 top-2 bottom-2 flex flex-col pointer-events-none',
  grid: 'grid grid-cols-4 [&_label]:text-right [&_label]:text-green-800 [&_p]:text-right [&_p]:text-green-600 bg-black/50 overflow-y-auto text-xs font-mono pointer-events-auto',
  row: 'col-span-full grid grid-cols-subgrid gap-2',
};

type StatsDebugInfo = {
  type: 'stats';
  entries: Record<string, string | number>;
};

export type SolidDebugInfo = {
  type: 'solid';
  tris: number;
  volume: number;
  verts: Array<{ idx: number; x: number; y: number; z: number }>;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  position?: [number, number, number];
};

type MeshDebugInfo = {
  type: 'mesh';
  tris: number;
  verts: number;
  position?: [number, number, number];
};

type SceneDebugInfo = {
  type: 'scene';
  objects: Array<{
    id: string;
    label?: string;
    primitive?: string;
    hasMesh: boolean;
    position: [number, number, number];
  }>;
};

export type DebugInfo = StatsDebugInfo | SolidDebugInfo | MeshDebugInfo | SceneDebugInfo | null;

/** Debug overlay panel showing solid geometry or tool stats. */
export const DebugPanel = ({ info }: { info: DebugInfo }) => {
  if (!info) {
    return null;
  }

  if (info.type === 'stats') {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {Object.entries(info.entries).map(([key, value]) => (
            <div key={key} className={styles.row}>
              <label>{key}</label>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (info.type === 'mesh') {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.row}>
            <label>tris</label>
            <p>{info.tris}</p>
          </div>
          <div className={styles.row}>
            <label>verts</label>
            <p>{info.verts}</p>
          </div>
          {info.position && (
            <div className={styles.row}>
              <label>pos</label>
              <p>{n(info.position[0], 1)}</p>
              <p>{n(info.position[1], 1)}</p>
              <p>{n(info.position[2], 1)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (info.type === 'scene') {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.row}>
            <label>objects</label>
            <p>{info.objects.length}</p>
          </div>
          <div className={styles.row}>
            <label />
            <label>x</label>
            <label>y</label>
            <label>z</label>
          </div>
          {info.objects.map((obj) => (
            <div key={obj.id} className={styles.row}>
              <label title={obj.id}>{obj.id.slice(0, 6)}</label>
              <p>{n(obj.position[0], 1)}</p>
              <p>{n(obj.position[1], 1)}</p>
              <p>{n(obj.position[2], 1)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.row}>
          <label>tris</label>
          <p>{info.tris}</p>
        </div>
        <div className={styles.row}>
          <label>verts</label>
          <p>{info.verts.length}</p>
        </div>
        <div className={styles.row}>
          <label>vol</label>
          <p>{n(info.volume, 1)}</p>
        </div>
        <div className={styles.row}>
          <label>min</label>
          <p>{n(info.bbox.min[0], 1)}</p>
          <p>{n(info.bbox.min[1], 1)}</p>
          <p>{n(info.bbox.min[2], 1)}</p>
        </div>
        <div className={styles.row}>
          <label>max</label>
          <p>{n(info.bbox.max[0], 1)}</p>
          <p>{n(info.bbox.max[1], 1)}</p>
          <p>{n(info.bbox.max[2], 1)}</p>
        </div>
        {info.position && (
          <div className={styles.row}>
            <label>pos</label>
            <p>{n(info.position[0], 1)}</p>
            <p>{n(info.position[1], 1)}</p>
            <p>{n(info.position[2], 1)}</p>
          </div>
        )}
        <div className={styles.row}>
          <label />
          <label>x</label>
          <label>y</label>
          <label>z</label>
        </div>
        {info.verts.map((v, i) => (
          <div key={i} className={styles.row}>
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
