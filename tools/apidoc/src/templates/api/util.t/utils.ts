//
// Copyright 2022 DXOS.org
//

import { type JSONOutput as S, ReflectionKind } from 'typedoc';

export const findReflection = (
  root: S.ContainerReflection,
  predicate: (node: S.Reflection) => boolean,
): S.Reflection | null => {
  if (predicate(root)) {
    return root;
  }
  if (!root.children?.length) {
    return null;
  }
  for (const child of root.children) {
    const nested = findReflection(child, predicate);
    if (nested) {
      return nested;
    }
  }
  return null;
};

export const reflectionById = (root: S.Reflection, id: number): S.Reflection | null => {
  return findReflection(root, (node) => node.id === id);
};

export const pathToReflectionId = (
  root: S.ContainerReflection,
  id: number,
  pathSoFar: S.Reflection[] = [],
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

export const packageOfReflectionId = (root: S.Reflection, id: number) => {
  return pathToReflectionId(root, id).find((r) => r.kind === ReflectionKind.Module) as S.ContainerReflection;
};

export const reflectionsOfKind = (p: S.ContainerReflection, ...kind: ReflectionKind[]): S.Reflection[] => {
  return [
    ...((Array.isArray(kind) ? kind : [kind]).indexOf(p.kind) >= 0 ? [p] : []),
    ...(p.children?.length ? p.children.map((c) => reflectionsOfKind(c, ...kind)).flat() : []),
  ];
};

export const packagesInProject = (p: S.ContainerReflection): S.ContainerReflection[] => {
  const modules = p?.children?.filter((ref) => ref.kind === ReflectionKind.Module);
  return modules ?? [];
};
