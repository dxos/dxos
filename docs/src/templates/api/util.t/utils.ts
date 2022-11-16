//
// Copyright 2022 DXOS.org
//

import { JSONOutput as S, ReflectionKind } from 'typedoc';

export const reflectionById = (root: S.ContainerReflection, id: number): S.Reflection | null => {
  if (root.id === id) {
    return root;
  }
  if (!root.children?.length) {
    return null;
  }
  for (const child of root.children) {
    const nested = reflectionById(child, id);
    if (nested) {
      return nested;
    }
  }
  return null;
};

export const pathToReflectionId = (
  root: S.ContainerReflection,
  id: number,
  pathSoFar: S.Reflection[] = []
): S.Reflection[] => {
  if (root.id === id) {
    return pathSoFar;
  }
  if (!root.children?.length) {
    return pathSoFar;
  }
  for (const child of root.children) {
    const p = pathToReflectionId(child, id, [...pathSoFar, child]);
    if (p[p.length - 1].id === id) {
      return p;
    }
  }
  return pathSoFar;
};

export const packageOfReflectionId = (root: S.ContainerReflection, id: number) => {
  return pathToReflectionId(root, id).find((r) => r.kind === ReflectionKind.Module);
};

export const reflectionsOfKind = (p: S.ContainerReflection, ...kind: ReflectionKind[]): S.Reflection[] => {
  return [
    ...((Array.isArray(kind) ? kind : [kind]).indexOf(p.kind) >= 0 ? [p] : []),
    ...(p.children?.length ? p.children.map((c) => reflectionsOfKind(c, ...kind)).flat() : [])
  ];
};

export const packagesInProject = (p: S.ContainerReflection): S.ContainerReflection[] => {
  const modulesGroup = p.groups?.find((g) => g.title === 'Modules');
  if (modulesGroup) {
    return modulesGroup.children?.map((c) => reflectionById(p, c)!).filter(Boolean) ?? [];
  } else {
    return [p];
  }
};
