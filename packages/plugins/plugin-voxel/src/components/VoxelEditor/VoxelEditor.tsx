//
// Copyright 2026 DXOS.org
//

/* eslint-disable react/no-unknown-property */

import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import React, { useCallback, useState } from 'react';
import * as THREE from 'three';

import { type VoxelData } from '../../types/Voxel';

/** Hue-to-hex mapping for the voxel color palette. */
export type PaletteEntry = {
  hue: string;
  hex: number;
};

/** Available voxel colors, aligned with ui-theme hues. */
export const PALETTE: PaletteEntry[] = [
  { hue: 'blue', hex: 0x4488ff },
  { hue: 'green', hex: 0x44bb44 },
  { hue: 'red', hex: 0xff4444 },
  { hue: 'amber', hex: 0xffbb00 },
  { hue: 'pink', hex: 0xff88ff },
  { hue: 'cyan', hex: 0x88ffff },
  { hue: 'orange', hex: 0xff8844 },
  { hue: 'violet', hex: 0x8844ff },
];

export type VoxelEditorProps = {
  /** Array of voxels to render. */
  voxels: VoxelData[];
  /** Grid size (default 16). */
  gridSize?: number;
  /** Currently selected color hex value. */
  selectedColor?: number;
  /** Called when user clicks to add a voxel. */
  onAddVoxel?: (voxel: VoxelData) => void;
  /** Called when user shift+clicks to remove a voxel. */
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

type GhostPosition = [number, number, number] | null;

/** Semi-transparent ghost cursor showing where a voxel will be placed. */
const GhostCursor = ({ position, color }: { position: GhostPosition; color: number }) => {
  if (!position) {
    return null;
  }

  return (
    <mesh position={position} raycast={() => {}}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color={color} transparent opacity={0.8} />
      </lineSegments>
    </mesh>
  );
};

type VoxelBlockProps = {
  position: [number, number, number];
  color: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
};

/** Voxel block mesh. */
const VoxelBlock = ({ position, color, onClick, onPointerMove, onPointerOut }: VoxelBlockProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      onClick={onClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        onPointerOut?.();
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        onPointerMove?.(event);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 0xaaaaaa : color} transparent={hovered} opacity={hovered ? 0.8 : 1} />
    </mesh>
  );
};

type GroundPlaneProps = {
  gridSize: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
};

/** Ground plane that accepts clicks to place voxels. */
const GroundPlane = ({ gridSize, onClick, onPointerMove, onPointerOut }: GroundPlaneProps) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[gridSize / 2 - 0.5, -0.5, gridSize / 2 - 0.5]}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      receiveShadow
    >
      <planeGeometry args={[gridSize, gridSize]} />
      <meshStandardMaterial color={0xcccccc} side={THREE.DoubleSide} transparent opacity={0.5} />
    </mesh>
  );
};

type VoxelSceneProps = {
  voxels: VoxelData[];
  gridSize: number;
  selectedColor: number;
  onAddVoxel?: (voxel: VoxelData) => void;
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

/** 3D scene containing the voxel world. */
const VoxelScene = ({ voxels, gridSize, selectedColor, onAddVoxel, onRemoveVoxel }: VoxelSceneProps) => {
  const [ghostPosition, setGhostPosition] = useState<GhostPosition>(null);

  const handleVoxelClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.shiftKey && onRemoveVoxel) {
        // Shift+click: remove voxel.
        const pos = event.object.position;
        onRemoveVoxel({ x: pos.x, y: pos.y, z: pos.z });
        return;
      }
      if (!event.shiftKey && onAddVoxel && event.face) {
        // Click: add voxel adjacent to clicked face.
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

  const handleVoxelPointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.shiftKey || !event.face) {
      setGhostPosition(null);
      return;
    }
    const normal = event.face.normal;
    const pos = event.object.position;
    setGhostPosition([
      Math.round(pos.x + normal.x),
      Math.round(pos.y + normal.y),
      Math.round(pos.z + normal.z),
    ]);
  }, []);

  const handleGroundClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!onAddVoxel || !event.point) {
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

  const handleGroundPointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.shiftKey || !event.point) {
      setGhostPosition(null);
      return;
    }
    setGhostPosition([Math.round(event.point.x), 0, Math.round(event.point.z)]);
  }, []);

  const clearGhost = useCallback(() => setGhostPosition(null), []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      <GroundPlane
        gridSize={gridSize}
        onClick={handleGroundClick}
        onPointerMove={handleGroundPointerMove}
        onPointerOut={clearGhost}
      />
      <gridHelper args={[gridSize, gridSize]} position={[gridSize / 2 - 0.5, -0.5, gridSize / 2 - 0.5]} />

      {voxels.map((voxel, index) => (
        <VoxelBlock
          key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`}
          position={[voxel.x, voxel.y, voxel.z]}
          color={voxel.color}
          onClick={handleVoxelClick}
          onPointerMove={handleVoxelPointerMove}
          onPointerOut={clearGhost}
        />
      ))}

      <GhostCursor position={ghostPosition} color={selectedColor} />

      <OrbitControls
        makeDefault
        mouseButtons={{ MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
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

/** Interactive 3D voxel editor with orbit controls. */
export const VoxelEditor = ({
  voxels,
  gridSize = 16,
  selectedColor = PALETTE[0].hex,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelEditorProps) => {
  return (
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
  );
};
