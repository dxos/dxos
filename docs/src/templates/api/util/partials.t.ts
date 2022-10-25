import os from "os";
import {
  Reflection,
  ReflectionKind,
  ParameterReflection,
  SignatureReflection,
  ContainerReflection,
  DeclarationReflection,
  JSONOutput as S,
} from "typedoc";
import { text, ts } from "@dxos/plate";
import { camelCase } from "change-case";
import { reflectionsOfKind } from "./utils.t";
import { stringifyCallSignature, stringifyType } from "./stringifiers.t";

export const children = (ref: S.ContainerReflection, kind?: ReflectionKind) => {
  return kind ? reflectionsOfKind(ref, kind) : ref.children ?? [];
};

export const tabs = (i: number = 0) => new Array(i).fill("  ").join("");

export const generic = (
  ref: S.ContainerReflection,
  indent: number = 0
): string => {
  return text`
  ${tabs(indent)}- ${ref.name} : ${ref.kindString}
  ${children(ref).map((e) => generic(e, indent + 1))}
  `;
};

export const sources = (ref: S.ContainerReflection) => {
  const { sources } = ref;
  return sources?.length
    ? `> Declared in ` +
        sources
          ?.map(
            (source) =>
              `[\`${source.fileName}:${source.line}\`](${source.url ?? ""})`
          )
          .join(" and ") +
        os.EOL
    : "";
};

export const comment = (comment?: S.Comment) => {
  return text`${comment?.summary?.map((s) => s.text).join(" ")}`;
};

export const param = (ref: S.ParameterReflection) => {
  return `${ref.name}: ${ref.type?.type}`;
};

export const signature = (ref: S.SignatureReflection): string => {
  // ${ts`const ${camelCase(ref.name)} = ${ref.name} (
  //   ${ref.parameters?.map(param).join("," + os.EOL)}
  // )`}
  return text`
  \`\`\`ts
  ${ref.name} ${stringifyCallSignature(ref)}
  \`\`\`
  ${comment(ref.comment)}
  `;
};

export const method = (ref: S.DeclarationReflection): string => {
  return text`
  ${ref.signatures?.map(signature)}
  `;
};

export const property = (ref: S.DeclarationReflection): string => {
  const accessor = (ref: S.DeclarationReflection): string => {
    return text`
    ### \`${ref.name}: ${
      ref.getSignature ? ` get ` + stringifyType(ref.getSignature.type!) : ""
    }${
      ref.setSignature ? `, set ${stringifyType(ref.setSignature.type!)}` : ""
    }\`
    ${comment(ref.getSignature?.comment)}
    ${comment(ref.setSignature?.comment)}
    `;
  };
  const field = (ref: S.DeclarationReflection): string => {
    return text`
    ### \`${ref.name}: ${stringifyType(ref.type!)}\`
    ${comment(ref.comment)}
    `;
  };
  return ref.kind == ReflectionKind.Accessor ? accessor(ref) : field(ref);
};

export const href = (ref: Reflection): string => {
  if (ref.kind == ReflectionKind.Class) {
    const [source] = ref.sources ?? [];
    return source ? `${source.url}` : `.`;
  } else {
    return ".";
  }
};
