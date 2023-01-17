import { JSONOutput as S, ReflectionKind } from 'typedoc';
export declare const findReflection: (root: S.ContainerReflection, predicate: (node: S.Reflection) => boolean) => S.Reflection | null;
export declare const reflectionById: (root: S.Reflection, id: number) => S.Reflection | null;
export declare const pathToReflectionId: (root: S.ContainerReflection, id: number, pathSoFar?: S.Reflection[]) => S.Reflection[];
export declare const packageOfReflectionId: (root: S.ContainerReflection, id: number) => S.Reflection | undefined;
export declare const reflectionsOfKind: (p: S.ContainerReflection, ...kind: ReflectionKind[]) => S.Reflection[];
export declare const packagesInProject: (p: S.ContainerReflection) => S.ContainerReflection[];
//# sourceMappingURL=utils.d.ts.map