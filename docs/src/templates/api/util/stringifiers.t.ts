import { JSONOutput as r } from "typedoc";
import * as t from "typedoc/dist/lib/models/types";
import { ModelToObject } from "typedoc/dist/lib/serialization/schema";

type AnyTypeName = keyof r.TypeKindMap;

declare module "typedoc" {
  export namespace JSONOutput {
    export interface Type {
      type: AnyTypeName;
    }
  }
}

const stringifyList = (list: r.Type[], separator: string): string => {
  return list.map((t) => stringifyType(t)).join(separator);
};

export const stringifyArray = (node: r.ArrayType): string => {
  const elementTypeStr = stringifyType(node.elementType);
  if (
    node.elementType.type == "union" ||
    node.elementType.type == "intersection"
  ) {
    return `(${elementTypeStr})[]`;
  } else {
    return `${elementTypeStr}[]`;
  }
};

export const stringifyConditional = (node: r.ConditionalType): string => {
  return `${node.checkType} extends ${node.extendsType} ? ${node.trueType} : ${node.falseType}`;
};

export const stringifyIndexedAccess = (node: r.IndexedAccessType): string => {
  return `${stringifyType(node.objectType)}[${stringifyType(node.indexType)}]`;
};

export const stringifyInferred = (node: r.InferredType): string => {
  return `infer ${node.name}`;
};

export const stringifyIntersection = (node: r.IntersectionType): string => {
  return stringifyList(node.types, " & ");
};

export const stringifyIntrinsic = (node: r.IntrinsicType): string => {
  return node.name;
};

export const stringifyPredicate = (node: r.PredicateType): string => {
  const out = node.asserts ? ["asserts", node.name] : [node.name];
  if (node.targetType) {
    out.push("is", stringifyType(node.targetType));
  }

  return out.join(" ");
};

export const stringifyQuery = (node: r.QueryType): string => {
  return `typeof ${stringifyType(node.queryType)}`;
};

export const stringifyReference = (node: r.ReferenceType): string => {
  const name = node.name;
  let typeArgs = "";
  if (node.typeArguments) {
    typeArgs += "<";
    typeArgs += stringifyList(node.typeArguments, ", ");
    typeArgs += ">";
  }
  console.log(name, node.id, node.qualifiedName, node.package);
  return name + typeArgs;
};

export const stringifyReflection = (node: r.ReflectionType): string => {
  if (!node.declaration?.children && node.declaration?.signatures) {
    return "function";
  } else {
    return "object";
  }
};

export const stringifyLiteral = (node: r.LiteralType): string => {
  return `"${node.value}"`;
};

export const stringifyTuple = (node: r.TupleType): string => {
  return node?.elements ? `[${stringifyList(node.elements, ", ")}]` : ``;
};

export const stringifyTypeOperator = (node: r.TypeOperatorType): string => {
  return `${node.operator} ${stringifyType(node.target)}`;
};

// export const stringifyTypeParameter = (node: t.TypeParameterType): string => {
//   return node.name;
// };

export const stringifyUnion = (node: r.UnionType): string => {
  return stringifyList(node.types, " | ");
};

export const stringifyUnknown = (node: r.UnknownType): string => {
  return node.name;
};

export const stringifyVoid = (): string => {
  return "void";
};

export const stringifyMapped = (node: r.MappedType): string => {
  return `{mapped type}`;
};

export const stringifyOptional = (node: r.OptionalType): string => {
  return `${stringifyType(node.elementType)}?`;
};

export const stringifyRest = (node: r.RestType): string => {
  return `...${stringifyType(node.elementType)}`;
};

export const stringifyTemplateLiteral = (
  node: r.TemplateLiteralType
): string => {
  const { head, tail } = node;
  return [
    "`",
    head,
    ...tail.map(([type, text]) => {
      return "${" + stringifyType(type) + "}" + text;
    }),
    "`",
  ].join("");
};

export const stringifyNamedTupleMember = (
  node: r.NamedTupleMemberType
): string => {
  const { name, isOptional, element } = node;
  return `${name}${isOptional ? "?" : ""}: ${stringifyType(element)}`;
};

const stringifiers = {
  array: stringifyArray,
  conditional: stringifyConditional,
  indexedAccess: stringifyIndexedAccess,
  inferred: stringifyInferred,
  intersection: stringifyIntersection,
  intrinsic: stringifyIntrinsic,
  predicate: stringifyPredicate,
  query: stringifyQuery,
  reference: stringifyReference,
  reflection: stringifyReflection,
  literal: stringifyLiteral,
  tuple: stringifyTuple,
  typeOperator: stringifyTypeOperator,
  // typeParameter: stringifyTypeParameter,
  union: stringifyUnion,
  unknown: stringifyUnknown,
  void: stringifyVoid,
  mapped: stringifyMapped,
  optional: stringifyOptional,
  rest: stringifyRest,
  "template-literal": stringifyTemplateLiteral,
  "named-tuple-member": stringifyNamedTupleMember,
};

/**
 * Return a string representation of the given type.
 */
export const stringifyType = (node: r.SomeType): string => {
  if (!(node?.type in stringifiers)) {
    throw new TypeError(`Cannot stringify type '${node.type}'`);
  }
  return stringifiers[node.type as keyof typeof stringifiers](node as any);
};

export const stringifyCallSignature = (
  node: r.SignatureReflection,
  name = ""
) => {
  const { parameters = [], typeParameter: typeParameters = [], type } = node;

  const types = typeParameters.map((t) => t.name).join(", ");

  const params = parameters
    .map((p) => {
      const type = p.type ? ": " + stringifyType(p.type) : "";
      return `${p.flags.isRest ? "..." : ""}${p.name}${type}`;
    })
    .join(", ");

  const returns = type ? stringifyType(type) : "";

  const returnToken = name === "" ? " => " : ": ";
  const typeParams = types === "" ? "" : " <" + types + ">";

  return `
        ${name}${typeParams} (${params})${returnToken}${returns}
    `.trim();
};
