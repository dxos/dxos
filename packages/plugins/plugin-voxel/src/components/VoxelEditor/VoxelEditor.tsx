//
// Copyright 2026 DXOS.org
//

/* eslint-disable react/no-unknown-property */

import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { type ColorStyles, type Hue, palette } from '@dxos/ui-theme';

import { type Voxel } from '../../types';

//
// Coordinate convention:
//   Voxel data: x (right), y (forward), z (up/height).
//   Three.js:   x (right), y (up),      z (forward).
//   Mapping: voxel (x, y, z) → Three.js (x, z, y).
//

/** Convert voxel coordinates to Three.js position, scaled by block size. */
const toThree = (x: number, y: number, z: number, blockSize = 1): [number, number, number] => [
  x * blockSize,
  z * blockSize,
  y * blockSize,
];

/** Convert Three.js position back to voxel coordinates. */
const fromThree = (tx: number, ty: number, tz: number): { x: number; y: number; z: number } => ({
  x: tx,
  y: tz,
  z: ty,
});

/** Resolve the fill color for a hue by applying the Tailwind class and sampling via canvas. */
const resolveHueColor = (hue: Hue): number => {
  const el = document.createElement('div');
  el.className = `bg-${hue}-fill`;
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  document.body.appendChild(el);
  const computed = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);

  if (!computed || computed === 'transparent' || computed === 'rgba(0, 0, 0, 0)') {
    return 0x888888;
  }

  // Use canvas to reliably convert any CSS color format (oklch, color(), rgb, etc.) to RGB.
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return 0x888888;
  }
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data;
  return (red << 16) | (green << 8) | blue;
};

export type VoxelBounds = {
  /** Center of the bounding box (Three.js coords). */
  center: [number, number, number];
  /** Camera position that frames all voxels (Three.js coords). */
  cameraPosition: [number, number, number];
};

/** Compute bounding box center and a camera position that frames all voxels. */
export const computeVoxelBounds = (voxels: Voxel.VoxelData[], blockSize = 1, padding = 1.5): VoxelBounds => {
  if (voxels.length === 0) {
    return { center: [0, 0, 0], cameraPosition: [4, 3, 4] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const voxel of voxels) {
    // Compute bounds in Three.js space.
    const [tx, ty, tz] = toThree(voxel.x, voxel.y, voxel.z);
    minX = Math.min(minX, tx);
    minY = Math.min(minY, ty);
    minZ = Math.min(minZ, tz);
    maxX = Math.max(maxX, tx);
    maxY = Math.max(maxY, ty);
    maxZ = Math.max(maxZ, tz);
  }

  const centerX = ((minX + maxX) / 2) * blockSize;
  const centerY = ((minY + maxY) / 2) * blockSize;
  const centerZ = ((minZ + maxZ) / 2) * blockSize;

  const sizeX = (maxX - minX + 1) * blockSize;
  const sizeY = (maxY - minY + 1) * blockSize;
  const sizeZ = (maxZ - minZ + 1) * blockSize;
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  const distance = maxSize * padding;

  return {
    center: [centerX, centerY, centerZ],
    cameraPosition: [centerX + distance, centerY + distance * 0.7, centerZ + distance],
  };
};

/** Tool modes for the voxel editor. */
export type ToolMode = 'select' | 'add' | 'remove';

/** Palette styles used in the voxel editor. */
export const PALETTE_STYLES: ColorStyles[] = palette.hues.filter((style, i) => i % 2 === 0);

/** Default hue. */
export const DEFAULT_HUE: Hue = 'blue';

export type VoxelEditorProps = {
  /** Array of voxels to render. */
  voxels: Voxel.VoxelData[];
  /** Grid extent along x-axis (default 16). */
  gridX?: number;
  /** Grid extent along y-axis (default 16). */
  gridY?: number;
  /** Size of each voxel block (default 1). */
  blockSize?: number;
  /** Currently selected tool mode. */
  toolMode?: ToolMode;
  /** Currently selected hue. */
  selectedHue?: Hue;
  /** Read-only mode (no interaction, no ground plane, no orbit controls). */
  readOnly?: boolean;
  /** Called when user clicks to add a voxel. */
  onAddVoxel?: (voxel: Voxel.VoxelData) => void;
  /** Called when user clicks to remove a voxel. */
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

type GhostPosition = [number, number, number] | null;

/** Semi-transparent ghost cursor showing where a voxel will be placed. */
const GhostCursor = ({ position, hue, isRemove }: { position: GhostPosition; hue: Hue; isRemove?: boolean }) => {
  if (!position) {
    return null;
  }

  const displayColor = isRemove ? 0xff0000 : resolveHueColor(hue);

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

type GridProps = {
  gridX: number;
  gridY: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
};

/** Ground grid on the Three.js X-Z plane (voxel X-Y plane), centered at origin. */
const Grid = ({ gridX, gridY, onClick, onPointerMove, onPointerOut }: GridProps) => {
  const halfX = Math.floor(gridX / 2);
  const halfY = Math.floor(gridY / 2);

  const gridLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const yPos = -0.5;

    // Lines along Three.js X-axis (varying Three.js Z = voxel Y).
    for (let idx = -halfY; idx <= halfY; idx++) {
      points.push(new THREE.Vector3(-halfX - 0.5, yPos, idx - 0.5));
      points.push(new THREE.Vector3(halfX - 0.5, yPos, idx - 0.5));
    }

    // Lines along Three.js Z-axis (varying Three.js X = voxel X).
    for (let idx = -halfX; idx <= halfX; idx++) {
      points.push(new THREE.Vector3(idx - 0.5, yPos, -halfY - 0.5));
      points.push(new THREE.Vector3(idx - 0.5, yPos, halfY - 0.5));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [halfX, halfY]);

  const centerX = -0.5;
  const centerZ = -0.5;

  return (
    <group>
      {/* Ground fill plane. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.501, centerZ]}>
        <planeGeometry args={[gridX, gridY]} />
        <meshStandardMaterial color={0xcccccc} side={THREE.DoubleSide} transparent opacity={0.1} />
      </mesh>
      {/* Click target (slightly above fill to catch raycasts). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.499, centerZ]}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      >
        <planeGeometry args={[gridX, gridY]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color={0x888888} transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};

/** Ensures the camera looks at the grid center with correct orientation after mount. */
const CameraSetup = ({ target }: { target: [number, number, number] }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target]);
  return null;
};

/** Blender-style orbit controls: middle-click orbit, Shift+middle pan, scroll zoom. */
const OrbitControlsManager = ({ gridX, gridY, blockSize }: { gridX: number; gridY: number; blockSize: number }) => {
  const { gl } = useThree();
  const controlsRef = useRef<any>(null);
  const maxDim = Math.max(gridX, gridY) * blockSize;
  const gridCenter = toThree(-0.5, -0.5, 0, blockSize);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 1) {
        // Shift+middle = pan, middle = orbit.
        controls.mouseButtons.MIDDLE = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      }
      if (event.button === 0 && event.altKey) {
        // Option+left-click = orbit (Shift+Option+left = pan).
        controls.mouseButtons.LEFT = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      } else if (event.button === 0 && event.shiftKey) {
        // Shift+left-click = pan.
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 0) {
        controls.mouseButtons.LEFT = -1 as THREE.MOUSE;
      }
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      mouseButtons={{
        LEFT: -1 as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: -1 as THREE.MOUSE,
      }}
      enableZoom
      target={gridCenter}
      maxPolarAngle={Math.PI / 2}
      minDistance={2}
      maxDistance={maxDim * 3}
    />
  );
};

/** Positions the camera to frame all voxels in readOnly mode. */
const FitCamera = ({ voxels, blockSize }: { voxels: Voxel.VoxelData[]; blockSize: number }) => {
  const { camera } = useThree();
  const bounds = useMemo(() => computeVoxelBounds(voxels, blockSize), [voxels, blockSize]);

  useEffect(() => {
    camera.position.set(...bounds.cameraPosition);
    camera.lookAt(...bounds.center);
    camera.updateProjectionMatrix();
  }, [camera, bounds]);

  return <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={bounds.center} />;
};

type VoxelSceneProps = {
  voxels: Voxel.VoxelData[];
  gridX: number;
  gridY: number;
  blockSize: number;
  toolMode: ToolMode;
  selectedHue: Hue;
  readOnly?: boolean;
  onAddVoxel?: (voxel: Voxel.VoxelData) => void;
  onRemoveVoxel?: (position: { x: number; y: number; z: number }) => void;
};

/** 3D scene containing the voxel world. */
const VoxelScene = ({
  voxels,
  gridX,
  gridY,
  blockSize,
  toolMode,
  selectedHue,
  readOnly,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelSceneProps) => {
  const [ghostPosition, setGhostPosition] = useState<GhostPosition>(null);

  // Filter voxels to only show those within grid bounds (centered at origin, z >= 0).
  const halfX = Math.floor(gridX / 2);
  const halfY = Math.floor(gridY / 2);
  const isInBounds = useCallback(
    (voxel: { x: number; y: number; z: number }) =>
      voxel.x >= -halfX && voxel.x < halfX && voxel.y >= -halfY && voxel.y < halfY && voxel.z >= 0,
    [halfX, halfY],
  );
  const visibleVoxels = useMemo(() => voxels.filter(isInBounds), [voxels, isInBounds]);

  const handleVoxelClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (toolMode === 'remove' && onRemoveVoxel) {
        const pos = event.object.position;
        onRemoveVoxel(fromThree(pos.x, pos.y, pos.z));
        return;
      }
      if (toolMode === 'add' && onAddVoxel && event.face) {
        const normal = event.face.normal;
        const pos = event.object.position;
        const voxel = fromThree(
          Math.round(pos.x + normal.x),
          Math.round(pos.y + normal.y),
          Math.round(pos.z + normal.z),
        );
        if (isInBounds(voxel)) {
          onAddVoxel({ ...voxel, hue: selectedHue });
        }
      }
    },
    [toolMode, onAddVoxel, onRemoveVoxel, selectedHue, isInBounds],
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
      if (toolMode !== 'add' || !onAddVoxel || !event.point) {
        return;
      }
      // Ground plane is at Three.js y=-0.5; place voxel at z=0 (height).
      const point = event.point;
      const voxel = { x: Math.round(point.x), y: Math.round(point.z), z: 0 };
      if (isInBounds(voxel)) {
        onAddVoxel({ ...voxel, hue: selectedHue });
      }
    },
    [toolMode, onAddVoxel, selectedHue, isInBounds],
  );

  const handleGroundPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (toolMode !== 'add' || !event.point) {
        setGhostPosition(null);
        return;
      }
      // Ghost in Three.js space: ground is at y=0 for voxel rendering.
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

      <group scale={[blockSize, blockSize, blockSize]}>
        {!readOnly && (
          <Grid
            gridX={gridX}
            gridY={gridY}
            onClick={handleGroundClick}
            onPointerMove={handleGroundPointerMove}
            onPointerOut={clearGhost}
          />
        )}

        {visibleVoxels.map((voxel, index) => (
          <VoxelBlock
            key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`}
            position={toThree(voxel.x, voxel.y, voxel.z)}
            color={resolveHueColor(voxel.hue as Hue)}
            onClick={readOnly ? () => {} : handleVoxelClick}
            onPointerMove={readOnly ? undefined : handleVoxelPointerMove}
            onPointerOut={readOnly ? undefined : clearGhost}
          />
        ))}

        {!readOnly && <GhostCursor position={ghostPosition} hue={selectedHue} isRemove={toolMode === 'remove'} />}
      </group>

      {readOnly ? (
        <FitCamera voxels={visibleVoxels} blockSize={blockSize} />
      ) : (
        <>
          <CameraSetup target={toThree(-0.5, -0.5, 0, blockSize)} />
          <OrbitControlsManager gridX={gridX} gridY={gridY} blockSize={blockSize} />
        </>
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
  gridX = 16,
  gridY = 16,
  blockSize = 1,
  toolMode = 'add',
  selectedHue = DEFAULT_HUE,
  readOnly,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelEditorProps) => {
  const maxDim = Math.max(gridX, gridY) * blockSize;
  const gridCenter = toThree(-0.5, -0.5, 0, blockSize);

  return (
    <Canvas
      camera={{
        position: [gridCenter[0], gridCenter[1] + maxDim * 0.5, gridCenter[2] + maxDim * 1.0],
        fov: 50,
        up: [0, 1, 0],
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <VoxelScene
        voxels={voxels}
        gridX={gridX}
        gridY={gridY}
        blockSize={blockSize}
        toolMode={toolMode}
        selectedHue={selectedHue}
        readOnly={readOnly}
        onAddVoxel={onAddVoxel}
        onRemoveVoxel={onRemoveVoxel}
      />
    </Canvas>
  );
};
