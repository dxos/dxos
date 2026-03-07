//
// Copyright 2026 DXOS.org
//

/* eslint-disable react/no-unknown-property */

import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { type ChromaticPalette } from '@dxos/ui-types';

import { type VoxelData } from '../../types/Voxel';

/** Tool modes for the voxel editor. */
export type ToolMode = 'select' | 'add' | 'remove';

/** Hex color mapping for ChromaticPalette hues (Tailwind 500 shades). */
const HUE_HEX: Record<ChromaticPalette, number> = {
  red: 0xef4444,
  orange: 0xf97316,
  amber: 0xf59e0b,
  yellow: 0xeab308,
  lime: 0x84cc16,
  green: 0x22c55e,
  emerald: 0x10b981,
  teal: 0x14b8a6,
  cyan: 0x06b6d4,
  sky: 0x0ea5e9,
  blue: 0x3b82f6,
  indigo: 0x6366f1,
  violet: 0x8b5cf6,
  purple: 0xa855f7,
  fuchsia: 0xd946ef,
  pink: 0xec4899,
  rose: 0xf43f5e,
};

/** Subset of hues used in the voxel palette. */
export const PALETTE_HUES: ChromaticPalette[] = ['blue', 'green', 'red', 'amber', 'pink', 'cyan', 'orange', 'violet'];

/** Get the Three.js hex color for a ChromaticPalette hue. */
export const getHueHex = (hue: ChromaticPalette): number => HUE_HEX[hue];

/** Default selected color. */
export const DEFAULT_COLOR = HUE_HEX.blue;

export type VoxelEditorProps = {
  /** Array of voxels to render. */
  voxels: VoxelData[];
  /** Grid width (x-axis, default 16). */
  gridWidth?: number;
  /** Grid depth (z-axis, default 16). */
  gridDepth?: number;
  /** Currently selected tool mode. */
  toolMode?: ToolMode;
  /** Currently selected color hex value. */
  selectedColor?: number;
  /** Read-only mode (no interaction, no ground plane, no orbit controls). */
  readOnly?: boolean;
  /** Called when user clicks to add a voxel. */
  onAddVoxel?: (voxel: VoxelData) => void;
  /** Called when user clicks to remove a voxel. */
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

type GhostPosition = [number, number, number] | null;

/** Semi-transparent ghost cursor showing where a voxel will be placed. */
const GhostCursor = ({ position, color, isRemove }: { position: GhostPosition; color: number; isRemove?: boolean }) => {
  if (!position) {
    return null;
  }

  const displayColor = isRemove ? 0xff0000 : color;

  return (
    <mesh position={position} raycast={() => {}}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={displayColor} transparent opacity={isRemove ? 0.3 : 0.4} depthWrite={false} />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color={displayColor} transparent opacity={0.8} />
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
  gridWidth: number;
  gridDepth: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
};

/** Ground plane that accepts clicks to place voxels. */
const GroundPlane = ({ gridWidth, gridDepth, onClick, onPointerMove, onPointerOut }: GroundPlaneProps) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[gridWidth / 2 - 0.5, -0.5, gridDepth / 2 - 0.5]}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      receiveShadow
    >
      <planeGeometry args={[gridWidth, gridDepth]} />
      <meshStandardMaterial color={0xcccccc} side={THREE.DoubleSide} transparent opacity={0.1} />
    </mesh>
  );
};

/** Custom grid with transparent lines and colored axes. */
const TransparentGrid = ({ gridWidth, gridDepth }: { gridWidth: number; gridDepth: number }) => {
  const gridRef = useRef<THREE.Group>(null);
  const gridLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const colors: number[] = [];

    const halfW = gridWidth / 2;
    const halfD = gridDepth / 2;
    const offsetX = gridWidth / 2 - 0.5;
    const offsetZ = gridDepth / 2 - 0.5;

    // Lines along X-axis (varying z).
    for (let idx = 0; idx <= gridDepth; idx++) {
      const zLocal = -halfD + idx;
      const zWorld = zLocal + offsetZ;
      const isOrigin = Math.abs(zWorld + 0.5) < 0.01;
      points.push(new THREE.Vector3(-halfW + offsetX, -0.5, zWorld));
      points.push(new THREE.Vector3(halfW + offsetX, -0.5, zWorld));
      // Red for X-axis origin line.
      const color = isOrigin ? [0.9, 0.2, 0.2] : [0.5, 0.5, 0.5];
      colors.push(...color, ...color);
    }

    // Lines along Z-axis (varying x).
    for (let idx = 0; idx <= gridWidth; idx++) {
      const xLocal = -halfW + idx;
      const xWorld = xLocal + offsetX;
      const isOrigin = Math.abs(xWorld + 0.5) < 0.01;
      points.push(new THREE.Vector3(xWorld, -0.5, -halfD + offsetZ));
      points.push(new THREE.Vector3(xWorld, -0.5, halfD + offsetZ));
      // Blue for Z-axis origin line.
      const color = isOrigin ? [0.2, 0.2, 0.9] : [0.5, 0.5, 0.5];
      colors.push(...color, ...color);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [gridWidth, gridDepth]);

  return (
    <group ref={gridRef}>
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};

/** Manage CMD-drag orbit controls. */
const OrbitControlsManager = ({ gridWidth, gridDepth }: { gridWidth: number; gridDepth: number }) => {
  const { gl } = useThree();
  const controlsRef = useRef<any>(null);
  const maxDim = Math.max(gridWidth, gridDepth);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      // Enable orbit on CMD/Ctrl+left-click or middle-click.
      if (event.button === 0 && !event.metaKey && !event.ctrlKey) {
        controls.enabled = false;
      } else {
        controls.enabled = true;
      }
    };

    const handlePointerUp = () => {
      controls.enabled = true;
    };

    const domElement = gl.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointerup', handlePointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      target={[gridWidth / 4, 0, gridDepth / 4]}
      maxPolarAngle={Math.PI / 2}
      minDistance={2}
      maxDistance={maxDim * 3}
    />
  );
};

type VoxelSceneProps = {
  voxels: VoxelData[];
  gridWidth: number;
  gridDepth: number;
  toolMode: ToolMode;
  selectedColor: number;
  readOnly?: boolean;
  onAddVoxel?: (voxel: VoxelData) => void;
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

/** 3D scene containing the voxel world. */
const VoxelScene = ({
  voxels,
  gridWidth,
  gridDepth,
  toolMode,
  selectedColor,
  readOnly,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelSceneProps) => {
  const [ghostPosition, setGhostPosition] = useState<GhostPosition>(null);

  // Filter voxels to only show those within grid bounds.
  const visibleVoxels = useMemo(
    () =>
      voxels.filter(
        (voxel) => voxel.x >= 0 && voxel.x < gridWidth && voxel.z >= 0 && voxel.z < gridDepth && voxel.y >= 0,
      ),
    [voxels, gridWidth, gridDepth],
  );

  const handleVoxelClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      if (toolMode === 'remove' && onRemoveVoxel) {
        const pos = event.object.position;
        onRemoveVoxel({ x: pos.x, y: pos.y, z: pos.z });
        return;
      }
      if (toolMode === 'add' && onAddVoxel && event.face) {
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
    [toolMode, onAddVoxel, onRemoveVoxel, selectedColor],
  );

  const handleVoxelPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (toolMode === 'select') {
        setGhostPosition(null);
        return;
      }
      if (toolMode === 'remove') {
        const pos = event.object.position;
        setGhostPosition([pos.x, pos.y, pos.z]);
        return;
      }
      if (!event.face) {
        setGhostPosition(null);
        return;
      }
      const normal = event.face.normal;
      const pos = event.object.position;
      setGhostPosition([Math.round(pos.x + normal.x), Math.round(pos.y + normal.y), Math.round(pos.z + normal.z)]);
    },
    [toolMode],
  );

  const handleGroundClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      if (toolMode !== 'add' || !onAddVoxel || !event.point) {
        return;
      }
      const point = event.point;
      onAddVoxel({
        x: Math.round(point.x),
        y: 0,
        z: Math.round(point.z),
        color: selectedColor,
      });
    },
    [toolMode, onAddVoxel, selectedColor],
  );

  const handleGroundPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (toolMode !== 'add' || !event.point) {
        setGhostPosition(null);
        return;
      }
      setGhostPosition([Math.round(event.point.x), 0, Math.round(event.point.z)]);
    },
    [toolMode],
  );

  const clearGhost = useCallback(() => setGhostPosition(null), []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      {!readOnly && (
        <GroundPlane
          gridWidth={gridWidth}
          gridDepth={gridDepth}
          onClick={handleGroundClick}
          onPointerMove={handleGroundPointerMove}
          onPointerOut={clearGhost}
        />
      )}
      <TransparentGrid gridWidth={gridWidth} gridDepth={gridDepth} />

      {visibleVoxels.map((voxel, index) => (
        <VoxelBlock
          key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`}
          position={[voxel.x, voxel.y, voxel.z]}
          color={voxel.color}
          onClick={readOnly ? () => {} : handleVoxelClick}
          onPointerMove={readOnly ? undefined : handleVoxelPointerMove}
          onPointerOut={readOnly ? undefined : clearGhost}
        />
      ))}

      {!readOnly && <GhostCursor position={ghostPosition} color={selectedColor} isRemove={toolMode === 'remove'} />}

      {readOnly ? (
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      ) : (
        <OrbitControlsManager gridWidth={gridWidth} gridDepth={gridDepth} />
      )}
      {!readOnly && (
        <GizmoHelper alignment='bottom-right' margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      )}
    </>
  );
};

/** Interactive 3D voxel editor with orbit controls. */
export const VoxelEditor = ({
  voxels,
  gridWidth = 16,
  gridDepth = 16,
  toolMode = 'add',
  selectedColor = DEFAULT_COLOR,
  readOnly,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelEditorProps) => {
  const maxDim = Math.max(gridWidth, gridDepth);

  return (
    <Canvas
      camera={{ position: [maxDim, maxDim * 0.8, maxDim], fov: 50 }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <VoxelScene
        voxels={voxels}
        gridWidth={gridWidth}
        gridDepth={gridDepth}
        toolMode={toolMode}
        selectedColor={selectedColor}
        readOnly={readOnly}
        onAddVoxel={onAddVoxel}
        onRemoveVoxel={onRemoveVoxel}
      />
    </Canvas>
  );
};
