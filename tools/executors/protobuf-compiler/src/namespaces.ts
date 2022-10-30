//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import * as pb from 'protobufjs';
import * as ts from 'typescript';

const f = ts.factory;

export type DeclarationFullName = string[];

export const getFullNestedTypeName = (type: pb.ReflectionObject): DeclarationFullName => {
  if (type.parent && type.parent instanceof pb.Type) {
    return [...getFullNestedTypeName(type.parent), type.name];
  } else {
    return [type.name];
  }
};

const isType = (obj: pb.ReflectionObject): obj is pb.Type | pb.Enum | pb.Service =>
  obj instanceof pb.Type || obj instanceof pb.Enum || obj instanceof pb.Service;

export const getNamespaceName = (type: pb.ReflectionObject): DeclarationFullName => {
  if (type.parent) {
    if (!isType(type)) {
      return [...getNamespaceName(type.parent), type.name];
    } else {
      return getNamespaceName(type.parent);
    }
  } else {
    return [];
  }
};

export const getRelativeName = (target: DeclarationFullName, base: DeclarationFullName): DeclarationFullName => {
  // TODO(dmaretskyi): Optimization: Remove recursion.
  if (target.length === 1 || base.length === 1) {
    return target;
  } else if (target[0] === base[0]) {
    return getRelativeName(target.slice(1), base.slice(1));
  } else {
    return target;
  }
};

export const convertNameToIdentifier = (name: DeclarationFullName): ts.QualifiedName | ts.Identifier => {
  if (name.length === 1) {
    return f.createIdentifier(name[0]);
  } else {
    return f.createQualifiedName(convertNameToIdentifier(name.slice(0, -1)), name[name.length - 1]);
  }
};

export const stringifyFullyQualifiedName = (name: DeclarationFullName) => name.join('.');

export const normalizeFullyQualifiedName = (name: string) => {
  if (name.startsWith('.')) {
    return name.slice(1);
  } else {
    return name;
  }
};

export const parseFullyQualifiedName = (name: string): DeclarationFullName => {
  const norm = normalizeFullyQualifiedName(name);
  return norm.split('.');
};

export const namesEqual = (a: DeclarationFullName, b: DeclarationFullName) =>
  a.length === b.length && a.every((_, i) => a[i] === b[i]);

export const getSafeNamespaceIdentifier = (name: DeclarationFullName) => name.join('_');

export const splitSchemaIntoNamespaces = (root: pb.Namespace): Map<string, pb.ReflectionObject[]> => {
  const res = new Map<string, pb.ReflectionObject[]>();

  const namespace = normalizeFullyQualifiedName(root.fullName);

  for (const obj of root.nestedArray) {
    if (isType(obj)) {
      if (!res.has(namespace)) {
        res.set(namespace, []);
      }
      const entry = res.get(namespace)!;

      entry.push(obj);
    } else if (obj instanceof pb.Namespace) {
      const nested = splitSchemaIntoNamespaces(obj);
      for (const [namespace, values] of nested) {
        assert(!res.has(namespace));
        res.set(namespace, values);
      }
    }
  }

  return res;
};
