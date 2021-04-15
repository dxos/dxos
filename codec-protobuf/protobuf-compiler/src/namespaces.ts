//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as pb from 'protobufjs';
import * as ts from 'typescript';

const f = ts.factory;

export type DeclarationFullName = string[];

export function getFullNestedTypeName (type: pb.ReflectionObject): DeclarationFullName {
  if (type.parent && type.parent instanceof pb.Type) {
    return [...getFullNestedTypeName(type.parent), type.name];
  } else {
    return [type.name];
  }
}

function isType (obj: pb.ReflectionObject): obj is (pb.Type | pb.Enum) {
  return obj instanceof pb.Type || obj instanceof pb.Enum;
}

export function getNamespaceName (type: pb.ReflectionObject): DeclarationFullName {
  if (type.parent) {
    if (!isType(type)) {
      return [...getNamespaceName(type.parent), type.name];
    } else {
      return getNamespaceName(type.parent);
    }
  } else {
    return [];
  }
}

export function getRelativeName (target: DeclarationFullName, base: DeclarationFullName): DeclarationFullName {
  // TODO(marik-d): Optimization: Remove recursion
  if (target.length === 1 || base.length === 1) {
    return target;
  } else if (target[0] === base[0]) {
    return getRelativeName(target.slice(1), base.slice(1));
  } else {
    return target;
  }
}

export function convertNameToIdentifier (name: DeclarationFullName): ts.QualifiedName | ts.Identifier {
  if (name.length === 1) {
    return f.createIdentifier(name[0]);
  } else {
    return f.createQualifiedName(convertNameToIdentifier(name.slice(0, -1)), name[name.length - 1]);
  }
}

export function stringifyFullyQualifiedName (name: DeclarationFullName) {
  return name.join('.');
}

export function normalizeFullyQualifiedName (name: string) {
  if (name.startsWith('.')) {
    return name.slice(1);
  } else {
    return name;
  }
}

export function parseFullyQualifiedName (name: string): DeclarationFullName {
  const norm = normalizeFullyQualifiedName(name);
  return norm.split('.');
}

export function namesEqual (a: DeclarationFullName, b: DeclarationFullName) {
  return a.length === b.length && a.every((_, i) => a[i] === b[i]);
}

export function getSafeNamespaceIdentifier (name: DeclarationFullName) {
  return name.join('_');
}

export function splitSchemaIntoNamespaces (root: pb.Namespace): Map<string, pb.ReflectionObject[]> {
  const res = new Map<string, pb.ReflectionObject[]>();

  const namespace = normalizeFullyQualifiedName(root.fullName);

  for (const obj of root.nestedArray) {
    if (obj instanceof pb.Enum || obj instanceof pb.Type) {
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
}
