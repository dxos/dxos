//
// Copyright 2020 DXOS.org
//

import pb from 'protobufjs';
import * as ts from 'typescript';

import { normalizeFullyQualifiedName } from '../namespaces';

import { type GeneratorContext } from './context';
import { createEnumDeclaration } from './enum';
import { createMessageDeclaration } from './message';
import { createServiceDeclaration } from './service';
import { getTypeReference } from './types';

const f = ts.factory;

export function* createDeclarations(types: pb.ReflectionObject[], ctx: GeneratorContext): Generator<ts.Statement> {
  for (const obj of types) {
    if (obj instanceof pb.Enum) {
      yield createEnumDeclaration(obj, ctx);
    } else if (obj instanceof pb.Service) {
      yield createServiceDeclaration(obj, ctx);
    } else if (obj instanceof pb.Type) {
      yield createMessageDeclaration(obj, ctx);

      const nested = Array.from(createDeclarations(obj.nestedArray, ctx));
      if (nested.length > 0) {
        yield f.createModuleDeclaration(
          [f.createToken(ts.SyntaxKind.ExportKeyword)],
          f.createIdentifier(obj.name),
          f.createModuleBlock(nested),
          ts.NodeFlags.Namespace,
        );
      }
    } else if (obj instanceof pb.Namespace) {
      yield* createDeclarations(obj.nestedArray, ctx);
    }
  }
}

function* getRegisteredTypes(root: pb.NamespaceBase): Generator<pb.Enum | pb.Type> {
  for (const obj of root.nestedArray) {
    if (obj instanceof pb.Enum) {
      yield obj;
    } else if (obj instanceof pb.Type) {
      yield obj;
      yield* getRegisteredTypes(obj);
    } else if (obj instanceof pb.Namespace) {
      yield* getRegisteredTypes(obj);
    }
  }
}

export const createTypeDictionary = (root: pb.NamespaceBase) =>
  f.createInterfaceDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    'TYPES',
    undefined,
    undefined,
    Array.from(getRegisteredTypes(root))
      .sort((b, a) => b.fullName.localeCompare(a.fullName))
      .map((type) =>
        f.createPropertySignature(
          undefined,
          f.createStringLiteral(normalizeFullyQualifiedName(type.fullName)),
          undefined,
          getTypeReference(type),
        ),
      ),
  );
