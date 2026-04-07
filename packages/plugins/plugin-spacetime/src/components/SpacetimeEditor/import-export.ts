//
// Copyright 2026 DXOS.org
//

import { type RefObject } from 'react';

import { Obj, Ref } from '@dxos/echo';

import { exportSTL, downloadFile } from '../../engine';
import { type Scene, Model } from '#types';

export type ImportExportOptions = {
  scene: Scene.Scene | undefined;
  selectedObjectId: string | null;
  hue: string;
  solidsRef: RefObject<Map<string, import('manifold-3d').Manifold> | null>;
  importGLBRef: RefObject<
    (data: ArrayBuffer | string) => Promise<{ vertexData: string; indexData: string } | undefined>
  >;
  setSelectedObjectId: (id: string | null) => void;
};

/** Opens a file picker and imports a GLB/OBJ file as an ECHO object. */
export const handleImport = ({ scene, hue, importGLBRef, setSelectedObjectId }: ImportExportOptions) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.glb,.gltf,.obj';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file || !scene) {
      return;
    }
    const data = file.name.endsWith('.obj') ? await file.text() : await file.arrayBuffer();
    const meshData = await importGLBRef.current(data);
    if (meshData) {
      const object = Model.make({
        primitive: undefined,
        label: file.name,
        mesh: meshData,
        color: hue,
      });
      Obj.change(scene, (obj) => {
        obj.objects.push(Ref.make(object));
      });
      Obj.setParent(object, scene);
      const objId = (object as any).id as string | undefined;
      if (objId) {
        setSelectedObjectId(objId);
      }
    }
  };
  input.click();
};

/** Exports the selected object as a binary STL file. */
export const handleExport = ({
  selectedObjectId,
  solidsRef,
}: Pick<ImportExportOptions, 'selectedObjectId' | 'solidsRef'>) => {
  if (!selectedObjectId || !solidsRef.current) {
    return;
  }
  const solid = solidsRef.current.get(selectedObjectId);
  if (solid) {
    const buffer = exportSTL(solid);
    downloadFile(buffer, 'object.stl');
  }
};
