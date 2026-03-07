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
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [red, green, blue] = ctx.getImageData(0, 0, 1, 1).data;
  return (red << 16) | (green << 8) | blue;
};

export type VoxelBounds = {
  /** Center of the bounding box. */
  center: [number, number, number];
  /** Camera position that frames all voxels. */
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
    minX = Math.min(minX, voxel.x);
    minY = Math.min(minY, voxel.y);
    minZ = Math.min(minZ, voxel.z);
    maxX = Math.max(maxX, voxel.x);
    maxY = Math.max(maxY, voxel.y);
    maxZ = Math.max(maxZ, voxel.z);
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
  /** Grid width (x-axis, default 16). */
  gridWidth?: number;
  /** Grid depth (z-axis, default 16). */
  gridDepth?: number;
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
  gridWidth: number;
  gridDepth: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
};

/** Ground grid with transparent fill, colored axes, and a click target. */
const Grid = ({ gridWidth, gridDepth, onClick, onPointerMove, onPointerOut }: GridProps) => {
  const gridLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const colors: number[] = [];
    const yPos = -0.5;

    // Lines along X-axis (varying z), from z=-0.5 to z=gridDepth-0.5.
    for (let idx = 0; idx <= gridDepth; idx++) {
      const zPos = idx - 0.5;
      const isOrigin = idx === 0;
      points.push(new THREE.Vector3(-0.5, yPos, zPos));
      points.push(new THREE.Vector3(gridWidth - 0.5, yPos, zPos));
      const color = isOrigin ? [0.9, 0.2, 0.2] : [0.5, 0.5, 0.5];
      colors.push(...color, ...color);
    }

    // Lines along Z-axis (varying x), from x=-0.5 to x=gridWidth-0.5.
    for (let idx = 0; idx <= gridWidth; idx++) {
      const xPos = idx - 0.5;
      const isOrigin = idx === 0;
      points.push(new THREE.Vector3(xPos, yPos, -0.5));
      points.push(new THREE.Vector3(xPos, yPos, gridDepth - 0.5));
      const color = isOrigin ? [0.2, 0.2, 0.9] : [0.5, 0.5, 0.5];
      colors.push(...color, ...color);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [gridWidth, gridDepth]);

  const centerX = gridWidth / 2 - 0.5;
  const centerZ = gridDepth / 2 - 0.5;

  return (
    <group>
      {/* Ground fill plane. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.501, centerZ]}>
        <planeGeometry args={[gridWidth, gridDepth]} />
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
        <planeGeometry args={[gridWidth, gridDepth]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};

/** Manage CMD-drag orbit controls. */
const OrbitControlsManager = ({
  gridWidth,
  gridDepth,
  blockSize,
}: {
  gridWidth: number;
  gridDepth: number;
  blockSize: number;
}) => {
  const { gl } = useThree();
  const controlsRef = useRef<any>(null);
  const maxDim = Math.max(gridWidth, gridDepth) * blockSize;

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
      target={[(gridWidth / 4) * blockSize, 0, (gridDepth / 4) * blockSize]}
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
  gridWidth: number;
  gridDepth: number;
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
  gridWidth,
  gridDepth,
  blockSize,
  toolMode,
  selectedHue,
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
          hue: selectedHue,
        });
      }
    },
    [toolMode, onAddVoxel, onRemoveVoxel, selectedHue],
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
        hue: selectedHue,
      });
    },
    [toolMode, onAddVoxel, selectedHue],
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

      <group scale={[blockSize, blockSize, blockSize]}>
        {!readOnly && (
          <Grid
            gridWidth={gridWidth}
            gridDepth={gridDepth}
            onClick={handleGroundClick}
            onPointerMove={handleGroundPointerMove}
            onPointerOut={clearGhost}
          />
        )}

        {visibleVoxels.map((voxel, index) => (
          <VoxelBlock
            key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`}
            position={[voxel.x, voxel.y, voxel.z]}
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
        <OrbitControlsManager gridWidth={gridWidth} gridDepth={gridDepth} blockSize={blockSize} />
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
  blockSize = 1,
  toolMode = 'add',
  selectedHue = DEFAULT_HUE,
  readOnly,
  onAddVoxel,
  onRemoveVoxel,
}: VoxelEditorProps) => {
  const maxDim = Math.max(gridWidth, gridDepth) * blockSize;

  return (
    <Canvas
      camera={{ position: [maxDim, maxDim * 0.8, maxDim], fov: 50 }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <VoxelScene
        voxels={voxels}
        gridWidth={gridWidth}
        gridDepth={gridDepth}
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
