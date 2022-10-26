import { JSONOutput as S, ReflectionKind } from 'typedoc';

export const reflectionById = (
  p: S.ContainerReflection,
  id: number
): S.Reflection | null => {
  if (p.id == id) return p;
  if (!p.children?.length) return null;
  for (let child of p.children) {
    const nested = reflectionById(child, id);
    if (nested) return nested;
  }
  return null;
};

export const reflectionsOfKind = (
  p: S.ContainerReflection,
  ...kind: ReflectionKind[]
): S.Reflection[] => {
  return [
    ...((Array.isArray(kind) ? kind : [kind]).indexOf(p.kind) >= 0 ? [p] : []),
    ...(p.children?.length
      ? p.children.map((c) => reflectionsOfKind(c, ...kind)).flat()
      : [])
  ];
};

export const packagesInProject = (
  p: S.ContainerReflection
): S.ContainerReflection[] => {
  const modulesGroup = p.groups?.find((g) => g.title == 'Modules');
  if (modulesGroup) {
    return (
      modulesGroup.children
        ?.map((c) => reflectionById(p, c)!)
        .filter(Boolean) ?? []
    );
  } else {
    return [p];
  }
};
