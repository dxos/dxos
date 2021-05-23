import * as ts from "typescript";
import * as protobufjs from "protobufjs";
import {SubstitutionsMap} from "../parser/substitutions-parser";
import {
    convertNameToIdentifier,
    getFullNestedTypeName,
    getNamespaceName,
    getRelativeName,
    getSafeNamespaceIdentifier,
    namesEqual
} from "../namespaces";

const f = ts.factory;

function createSubstitutionsReference(type: string): ts.TypeNode {
    return f.createTypeReferenceNode(
        f.createIdentifier('ReturnType'),
        [f.createIndexedAccessTypeNode(
            f.createIndexedAccessTypeNode(
                f.createTypeQueryNode(f.createIdentifier('substitutions')),
                f.createLiteralTypeNode(f.createStringLiteral(type))
            ),
            f.createLiteralTypeNode(f.createStringLiteral('decode'))
        )]
    );
}

function getPrimitiveType(type: string): ts.TypeNode {
    switch (type) {
        case 'double':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'float':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'int32':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'int64':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'uint32':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'uint64':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'sint32':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'sint64':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'fixed32':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'fixed64':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'sfixed32':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'sfixed64':
            return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'bool':
            return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
        case 'string':
            return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        case 'bytes':
            return f.createTypeReferenceNode('Uint8Array');
        default:
            return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }
}

type PbType = protobufjs.Enum | protobufjs.Type | string

export function types(type: PbType, containingObject: protobufjs.ReflectionObject, subs: SubstitutionsMap) {
    if (typeof type === 'string') {
        return getPrimitiveType(type);
    } else if (subs[type.fullName.slice(1)]) {
        return createSubstitutionsReference(type.fullName.slice(1));
    } else {
        return getTypeReference(type, containingObject);
    }
}

export function getTypeReference(to: protobufjs.Type | protobufjs.Enum, from?: protobufjs.ReflectionObject) {
    const toNamespace = getNamespaceName(to);
    const fromNamespace = from && getNamespaceName(from);

    if (fromNamespace && namesEqual(toNamespace, fromNamespace)) {
        const relativeName = getRelativeName(getFullNestedTypeName(to), toNamespace);
        return f.createTypeReferenceNode(convertNameToIdentifier(relativeName));
    } else {
        const name = [getSafeNamespaceIdentifier(toNamespace), ...getFullNestedTypeName(to)];
        return f.createTypeReferenceNode(convertNameToIdentifier(name));
    }
}