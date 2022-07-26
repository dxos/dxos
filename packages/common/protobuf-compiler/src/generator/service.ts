//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { dirname, relative } from 'path';
import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { normalizeFullyQualifiedName } from '../namespaces';
import { SubstitutionsMap } from '../parser';
import { GeneratorContext } from './context';
import { attachDocComment } from './doc-comment';
import { types, getTypeReference } from './types';

const f = ts.factory;

const getRpcTypes = (method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap): [ts.TypeNode, ts.TypeNode] => {
  method.resolve();
  return [
    types(method.resolvedRequestType ?? method.requestType, service, subs),
    types(method.resolvedResponseType ?? method.responseType, service, subs)
  ];
};

const createRpcMethodType = (method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap) => {
  assert(!method.requestStream, 'Streaming RPC requests are not supported.');

  const [requestType, responseType] = getRpcTypes(method, service, subs);

  const outputTypeMonad = method.responseStream ? f.createIdentifier('Stream') : f.createIdentifier('Promise');

  return f.createFunctionTypeNode(
    undefined,
    [f.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      'request',
      undefined,
      requestType
    )],
    f.createTypeReferenceNode(
      outputTypeMonad,
      [responseType]
    )
  );
};

export const createServiceDeclaration = (type: protobufjs.Service, ctx: GeneratorContext): ts.InterfaceDeclaration => {
  const declaration = f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.methodsArray
      .filter(m => !m.requestStream)
      .map(method => {
        const sig = f.createPropertySignature(
          undefined,
          mapRpcMethodName(method.name),
          undefined,
          createRpcMethodType(method, type, ctx.subs)
        );

        return method.comment ? attachDocComment(sig, method.comment) : sig;
      })
  );

  const commentSections = type.comment ? [type.comment] : []
  if(type.filename) {
    commentSections.push(`Defined in:\n  {@link file://./${relative(dirname(ctx.outputFilename), type.filename)}}`)
  }

  if (commentSections.length === 0) {
    return declaration;
  }

  return attachDocComment(declaration, commentSections.join('\n\n'));
};

function * getServices (root: protobufjs.NamespaceBase): Generator<protobufjs.Service> {
  for (const obj of root.nestedArray) {
    if (obj instanceof protobufjs.Service) {
      yield obj;
      yield * getServices(obj);
    } else if (obj instanceof protobufjs.Namespace) {
      yield * getServices(obj);
    }
  }
}

export const createServicesDictionary = (root: protobufjs.NamespaceBase) => f.createInterfaceDeclaration(
  undefined,
  [f.createToken(ts.SyntaxKind.ExportKeyword)],
  'SERVICES',
  undefined,
  undefined,
  Array.from(getServices(root))
    .sort((b, a) => b.fullName.localeCompare(a.fullName))
    .map(type => f.createPropertySignature(
      undefined,
      f.createStringLiteral(normalizeFullyQualifiedName(type.fullName)),
      undefined,
      getTypeReference(type)
    ))
);

const mapRpcMethodName = (name: string) => name[0].toLocaleLowerCase() + name.substring(1);
