//
// Copyright 2026 DXOS.org
//

import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import React, { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';

import { type VoxelData } from '../../types/Voxel';

const PALETTE = [0x4488ff, 0x44bb44, 0xff4444, 0xffbb00, 0xff88ff, 0x88ffff, 0xff8844, 0xffffff];

export type VoxelEditorProps = {
  /** Array of voxels to render. */
  voxels: VoxelData[];
  /** Grid size (default 16). */
  gridSize?: number;
  /** Called when user clicks to add a voxel. */
  onAddVoxel?: (voxel: VoxelData) => void;
  /** Called when user shift+clicks to remove a voxel. */
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

/** Voxel block mesh. */
const VoxelBlock = ({
  position,
  color,
  onPointerDown,
}: {
  position: [number, number, number];
  color: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      onPointerDown={onPointerDown}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? 0xaaaaaa : color}
        transparent={hovered}
        opacity={hovered ? 0.8 : 1}
      />
    </mesh>
  );
};

/** Ground plane that accepts clicks to place voxels. */
const GroundPlane = ({
  gridSize,
  onPointerDown,
}: {
  gridSize: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[gridSize / 2 - 0.5, -0.5, gridSize / 2 - 0.5]}
      onPointerDown={onPointerDown}
      receiveShadow
    >
      <planeGeometry args={[gridSize, gridSize]} />
      <meshStandardMaterial color={0xcccccc} side={THREE.DoubleSide} transparent opacity={0.5} />
    </mesh>
  );
};

/** 3D scene containing the voxel world. */
const VoxelScene = ({ voxels, gridSize, selectedColor, onAddVoxel, onRemoveVoxel }: {
  voxels: VoxelData[];
  gridSize: number;
  selectedColor: number;
  onAddVoxel?: (voxel: VoxelData) => void;
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
}) => {
  const handleVoxelClick = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.button === 0 && event.shiftKey && onRemoveVoxel) {
        // Shift+left-click: remove voxel.
        const pos = event.object.position;
        onRemoveVoxel({ x: pos.x, y: pos.y, z: pos.z });
        return;
      }
      if (event.button === 0 && !event.shiftKey && onAddVoxel && event.face) {
        // Left-click: add voxel adjacent to clicked face.
        const normal = event.face.normal;
        const pos = event.object.position;
        onAddVoxel({
          x: Math.round(pos.x + normal.x),
          y: Math.round(pos.y + normal.y),
          z: Math.round(pos.z + normal.z),
          color: selectedColor,
        });
      }
    },
    [onAddVoxel, onRemoveVoxel, selectedColor],
  );

  const handleGroundClick = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.button !== 0 || !onAddVoxel || !event.point) {
        return;
      }
      // Place voxel on the ground at the clicked position.
      const point = event.point;
      onAddVoxel({
        x: Math.round(point.x),
        y: 0,
        z: Math.round(point.z),
        color: selectedColor,
      });
    },
    [onAddVoxel, selectedColor],
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      <GroundPlane gridSize={gridSize} onPointerDown={handleGroundClick} />
      <gridHelper args={[gridSize, gridSize]} position={[gridSize / 2 - 0.5, -0.5, gridSize / 2 - 0.5]} />

      {voxels.map((voxel, index) => (
        <VoxelBlock
          key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`}
          position={[voxel.x, voxel.y, voxel.z]}
          color={voxel.color}
          onPointerDown={handleVoxelClick}
        />
      ))}

      <OrbitControls
        makeDefault
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        target={[gridSize / 4, 0, gridSize / 4]}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={gridSize * 3}
      />
      <GizmoHelper alignment='bottom-right' margin={[60, 60]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  );
};

/** Color palette button. */
const ColorButton = ({
  color,
  selected,
  onClick,
}: {
  color: number;
  selected: boolean;
  onClick: () => void;
}) => {
  const hexStr = useMemo(() => `#${color.toString(16).padStart(6, '0')}`, [color]);
  return (
    <button
      type='button'
      className='bs-10 is-10 rounded border-2 cursor-pointer'
      style={{
        backgroundColor: hexStr,
        borderColor: selected ? '#000' : 'transparent',
        outline: selected ? '2px solid white' : 'none',
      }}
      onClick={onClick}
      title={hexStr}
    />
  );
};

/** Interactive 3D voxel editor with color palette and orbit controls. */
export const VoxelEditor = ({ voxels, gridSize = 16, onAddVoxel, onRemoveVoxel }: VoxelEditorProps) => {
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);

  return (
    <div className='flex flex-col h-full w-full'>
      <div className='flex gap-1 p-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700'>
        {PALETTE.map((color) => (
          <ColorButton
            key={color}
            color={color}
            selected={color === selectedColor}
            onClick={() => setSelectedColor(color)}
          />
        ))}
        <span className='mlb-auto text-xs text-neutral-500 pli-2'>
          Click: add | Shift+click: remove | Right drag: rotate
        </span>
      </div>
      <div className='grow'>
        <Canvas
          camera={{ position: [gridSize, gridSize * 0.8, gridSize], fov: 50 }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <VoxelScene
            voxels={voxels}
            gridSize={gridSize}
            selectedColor={selectedColor}
            onAddVoxel={onAddVoxel}
            onRemoveVoxel={onRemoveVoxel}
          />
        </Canvas>
      </div>
    </div>
  );
};
