//
// Copyright 2022 DXOS.org
//
import { ReflectionKind } from 'typedoc';
export const findReflection = (root, predicate) => {
    var _a;
    if (predicate(root)) {
        return root;
    }
    if (!((_a = root.children) === null || _a === void 0 ? void 0 : _a.length)) {
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
export const reflectionById = (root, id) => {
    return findReflection(root, (node) => node.id === id);
};
export const pathToReflectionId = (root, id, pathSoFar = []) => {
    var _a;
    if (root.id === id) {
        return pathSoFar;
    }
    if (!((_a = root.children) === null || _a === void 0 ? void 0 : _a.length)) {
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
export const packageOfReflectionId = (root, id) => {
    return pathToReflectionId(root, id).find((r) => r.kind === ReflectionKind.Module);
};
export const reflectionsOfKind = (p, ...kind) => {
    var _a;
    return [
        ...((Array.isArray(kind) ? kind : [kind]).indexOf(p.kind) >= 0 ? [p] : []),
        ...(((_a = p.children) === null || _a === void 0 ? void 0 : _a.length) ? p.children.map((c) => reflectionsOfKind(c, ...kind)).flat() : [])
    ];
};
export const packagesInProject = (p) => {
    var _a, _b, _c;
    const modulesGroup = (_a = p.groups) === null || _a === void 0 ? void 0 : _a.find((g) => g.title === 'Modules');
    if (modulesGroup) {
        return (_c = (_b = modulesGroup.children) === null || _b === void 0 ? void 0 : _b.map((c) => reflectionById(p, c)).filter(Boolean)) !== null && _c !== void 0 ? _c : [];
    }
    else {
        return [p];
    }
};
//# sourceMappingURL=utils.js.map