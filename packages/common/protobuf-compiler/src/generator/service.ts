//
// Copyright 2020 DXOS.org
//

import { dirname, relative } from 'path';

import pb from 'protobufjs';
import * as ts from 'typescript';

import { invariant } from '@dxos/invariant';

import { normalizeFullyQualifiedName } from '../namespaces';
import { type SubstitutionsMap } from '../parser';

import { type GeneratorContext } from './context';
import { attachDocComment } from './doc-comment';
import { getTypeReference, types } from './types';

const f = ts.factory;

const getRpcTypes = (method: pb.Method, service: pb.Service, subs: SubstitutionsMap): [ts.TypeNode, ts.TypeNode] => {
  method.resolve();
  return [
    types(method.resolvedRequestType ?? method.requestType, service, subs),
    types(method.resolvedResponseType ?? method.responseType, service, subs),
  ];
};

const createRpcMethodType = (method: pb.Method, service: pb.Service, subs: SubstitutionsMap) => {
  invariant(!method.requestStream, 'Streaming RPC requests are not supported.');

  const [requestType, responseType] = getRpcTypes(method, service, subs);

  const outputTypeMonad = method.responseStream ? f.createIdentifier('Stream') : f.createIdentifier('Promise');

  return f.createFunctionTypeNode(
    undefined,
    [
      f.createParameterDeclaration(undefined, undefined, 'request', undefined, requestType),
      f.createParameterDeclaration(
        undefined,
        undefined,
        'options',
        f.createToken(ts.SyntaxKind.QuestionToken),
        f.createTypeReferenceNode(f.createIdentifier('RequestOptions')),
        undefined,
      ),
    ],
    f.createTypeReferenceNode(outputTypeMonad, [responseType]),
  );
};

export const createServiceDeclaration = (type: pb.Service, ctx: GeneratorContext): ts.InterfaceDeclaration => {
  const declaration = f.createInterfaceDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.methodsArray
      .filter((m) => !m.requestStream)
      .map((method) => {
        const sig = f.createPropertySignature(
          undefined,
          mapRpcMethodName(method.name),
          undefined,
          createRpcMethodType(method, type, ctx.subs),
        );

        return method.comment ? attachDocComment(sig, method.comment) : sig;
      }),
  );

  const commentSections = type.comment ? [type.comment] : [];
  if (type.filename) {
    commentSections.push(`Defined in:\n  {@link file://./${relative(dirname(ctx.outputFilename), type.filename)}}`);
  }

  if (commentSections.length === 0) {
    return declaration;
  }

  return attachDocComment(declaration, commentSections.join('\n\n'));
};

function* getServices(root: pb.NamespaceBase): Generator<pb.Service> {
  for (const obj of root.nestedArray) {
    if (obj instanceof pb.Service) {
      yield obj;
      yield* getServices(obj);
    } else if (obj instanceof pb.Namespace) {
      yield* getServices(obj);
    }
  }
}

export const createServicesDictionary = (root: pb.NamespaceBase) =>
  f.createInterfaceDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    'SERVICES',
    undefined,
    undefined,
    Array.from(getServices(root))
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

const mapRpcMethodName = (name: string) => name[0].toLocaleLowerCase() + name.substring(1);
