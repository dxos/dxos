import os from "os";
import {
  Reflection,
  ReflectionKind,
  ParameterReflection,
  SignatureReflection,
  DeclarationReflection,
} from "typedoc";
import { text, ts } from "@dxos/plate";
import { camelCase } from "change-case";

export const children = (ref: Reflection, kind?: ReflectionKind) => {
  const results: Reflection[] = [];
  ref.traverse((reflection) => {
    if (typeof kind == "undefined" || reflection.kind == kind)
      results.push(reflection);
  });
  return results;
};

export const tabs = (i: number = 0) => new Array(i).fill("  ").join("");

export const generic = (ref: Reflection, indent: number = 0): string => {
  return text`
  ${tabs(indent)}- ${ref.name} : ${ref.kindString}
  ${children(ref).map((e) => generic(e, indent + 1))}
  `;
};

export const comment = (ref: Reflection) => {
  return text`${ref.comment?.summary?.map((s) => s.text).join(" ")}`;
};

export const param = (ref: ParameterReflection) => {
  const s = ref.type?.type;
  return `    ${ref.name}: ${ref.type}`;
};

export const signature = (ref: SignatureReflection): string => {
  return text`
  \`\`\`ts
  ${ts`const ${camelCase(ref.name)} = ${ref.name}(
    ${ref.parameters?.map(param).join("," + os.EOL)}
  )`}
  \`\`\`
  ${comment(ref)}
  `;
};

export const method = (ref: DeclarationReflection): string => {
  return text`
  ${ref.getAllSignatures()?.map(signature)}
  `;
};

export const href = (ref: Reflection): string => {
  if (ref.kind == ReflectionKind.Class) {
    const [source] = ref.sources ?? [];
    return source ? `${source.url}` : `.`;
  } else {
    return ".";
  }
};
