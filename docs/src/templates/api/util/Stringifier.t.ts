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
import { TypeStringifier } from './MdTypeStringifier.t';

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
      ? `Declared in ` +
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
  json(val: any) {
    return text`
    \`\`\`json
    ${JSON.stringify(val, null, 2)}
    \`\`\`
    `;
  }
  signature(ref: Schema.SignatureReflection): string {
    const { name, type, parameters } = ref;
    return text`
    ${this.comment(ref.comment)}
    
    Returns: ${this.types.stringify(type!)}

    Arguments: ${!parameters?.length && 'none'}

    ${parameters?.map((p) => this.param(p)).join(os.EOL + os.EOL)}
    `;
  }
  param(ref: Schema.ParameterReflection) {
    return `\`${ref.name}\`: ${this.types.stringify(ref.type!)}`;
  }
  method(ref: Schema.DeclarationReflection): string {
    return text`
    ### [\`${ref.name}\`](${ref.sources?.[0]?.url})
    ${this.comment(ref.comment)}

    ${ref.signatures?.map((s) => this.signature(s))}
    `;
  }
  property(ref: Schema.DeclarationReflection): string {
    const template = (nodes: Schema.DeclarationReflection[]): string => {
      return text`
      ### [\`${ref.name}\`](${ref.sources?.[0]?.url})
      Type: ${nodes
        .filter(Boolean)
        .map((t) => this.types.stringify(t.type!))
        .join(', ')}
      
      ${nodes
        .filter(Boolean)
        .map((node) => this.comment(node.comment))
        .join(os.EOL + os.EOL)}
      `;
    };
    return template(
      ref.kind == ReflectionKind.Accessor
        ? [ref.getSignature!, ref.setSignature!]
        : [ref]
    );
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
