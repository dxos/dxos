import { JSONOutput as S } from "typedoc";

export const findReflection = (
  p: S.ContainerReflection,
  id: number
): S.Reflection | null => {
  if (p.id == id) return p;
  if (!p.children?.length) return null;
  for (let child of p.children) {
    const nested = findReflection(child, id);
    if (nested) return nested;
  }
  return null;
};

export const getModulesInProject = (
  p: S.ContainerReflection
): S.ContainerReflection[] => {
  const modulesGroup = p.groups?.find((g) => g.title == "Modules");
  if (modulesGroup) {
    return (
      modulesGroup.children
        ?.map((c) => findReflection(p, c)!)
        .filter(Boolean) ?? []
    );
  } else {
    return [p];
  }
};
