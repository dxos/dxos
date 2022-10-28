import os from 'os';
import {
  Reflection,
  ReflectionKind,
  ParameterReflection,
  SignatureReflection,
  ContainerReflection,
  DeclarationReflection,
  JSONOutput as Schema
} from 'typedoc';
import { text, ts } from '@dxos/plate';
import { reflectionsOfKind } from './utils.t';
import { TypeStringifier } from './TypeStringifier.t';

const tabs = (i: number = 0) => new Array(i).fill('  ').join('');

export class Stringifier {
  public readonly types = new TypeStringifier(this.root);
  constructor(public readonly root: Schema.Reflection) {}

  children(ref: Schema.ContainerReflection, kind?: ReflectionKind) {
    return kind ? reflectionsOfKind(ref, kind) : ref.children ?? [];
  }
  generic(ref: Schema.ContainerReflection, indent: number = 0): string {
    return text`
    ${tabs(indent)}- ${ref.name} : ${ref.kindString}
    ${this.children(ref).map((e) => this.generic(e, indent + 1))}
    `;
  }
  sources(ref: Schema.ContainerReflection) {
    const { sources } = ref;
    return sources?.length
      ? `> Declared in ` +
          sources
            ?.map(
              (source) =>
                `[\`${source.fileName}:${source.line}\`](${source.url ?? ''})`
            )
            .join(' and ') +
          os.EOL
      : '';
  }
  comment(comment?: Schema.Comment) {
    return text`${comment?.summary?.map((s) => s.text).join(' ')}`;
  }
  signature(ref: Schema.SignatureReflection): string {
    // ${ts`const ${camelCase(ref.name)} = ${ref.name} (
    //   ${ref.parameters?.map(param).join("," + os.EOL)}
    // )`}
    return text`
    \`\`\`ts
    ${this.types.callSignature(ref)}
    \`\`\`
    ${this.comment(ref.comment)}
    `;
  }
  json(val: any) {
    return text`
    \`\`\`json
    ${JSON.stringify(val, null, 2)}
    \`\`\`
    `;
  }
  param(ref: Schema.ParameterReflection) {
    return `${ref.name}: ${ref.type?.type}`;
  }
  method(ref: Schema.DeclarationReflection): string {
    return text`
    ### ${ref.name}
    ${ref.signatures?.map(s => this.signature(s))}
    `;
  }
  property(ref: Schema.DeclarationReflection): string {
    const { types } = this;
    const accessor = (ref: Schema.DeclarationReflection): string => {
      return text`
      ### ${ref.name}
      Type: ${ref.getSignature ? types.type(ref.getSignature.type!) : ''}${
        ref.setSignature ? `, ${types.type(ref.setSignature.type!)}` : ''
      }
      
      ${this.comment(ref.getSignature?.comment)}
      ${this.comment(ref.setSignature?.comment)}
      `;
    };
    const field = (ref: Schema.DeclarationReflection): string => {
      return text`
      ### ${ref.name} 
      Type: ${types.type(ref.type!)}
      
      ${this.comment(ref.comment)}
      `;
    };
    return ref.kind == ReflectionKind.Accessor ? accessor(ref) : field(ref);
  }
  href(ref: Reflection): string {
    if (ref.kind == ReflectionKind.Class) {
      const [source] = ref.sources ?? [];
      return source ? `${source.url}` : `.`;
    } else {
      return '.';
    }
  }
}
