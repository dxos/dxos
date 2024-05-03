//
// Copyright 2022 DXOS.org
//

import os from 'os';
import { ReflectionKind, type JSONOutput as Schema } from 'typedoc';

import { plate } from '@dxos/plate';

import { MdTypeStringifier } from './MdTypeStringifier.js';
import { TypeStringifier } from './TypeStringifier.js';
import { reflectionById, reflectionsOfKind } from './utils.js';

const tabs = (i = 0) => new Array(i).fill('  ').join('');
const pounds = (n: number) => new Array(n).fill('#').join('');

export type ClassMemberKind = 'constructors' | 'properties' | 'methods';
export type RenderingStyle = 'list' | 'table';
export type Alignment = 'left' | 'center' | 'right';
export type StringifyOptions = {
  title?: boolean;
  sources?: boolean;
  comment?: boolean;
  headers?: boolean;
  subset?: ClassMemberKind[];
  style?: RenderingStyle;
  level?: number;
};

export class Stringifier {
  constructor(public readonly root: Schema.Reflection) {
    this.md = new MdTypeStringifier(this.root);
    this.txt = new TypeStringifier(this.root);
  }

  public readonly md: MdTypeStringifier;
  public readonly txt: TypeStringifier;

  children(ref: Schema.ContainerReflection, kind?: ReflectionKind) {
    return kind ? reflectionsOfKind(ref, kind) : ref.children ?? [];
  }

  href(ref: Schema.DeclarationReflection): string {
    if (ref.kind === ReflectionKind.Class) {
      const [source] = ref.sources ?? [];
      return source ? `${source.url}` : '.';
    } else {
      return '.';
    }
  }

  generic(ref: Schema.ContainerReflection, indent = 0): string {
    return plate`
    ${tabs(indent)}- ${ref.name} : ${ReflectionKind.classString(ref.kind)}
    ${this.children(ref).map((e) => this.generic(e, indent + 1))}
    `;
  }

  sources(ref: Schema.DeclarationReflection) {
    const { sources } = ref;
    return sources?.length
      ? '<sub>Declared in ' +
          sources?.map((source) => `[${source.fileName}:${source.line}](${source.url ?? ''})`).join(' and ') +
          '</sub>' +
          os.EOL
      : '';
  }

  comment(comment?: Schema.Comment) {
    return plate`${comment?.summary?.map((s) => s.text).join(' ')}`;
  }

  json(val: any) {
    return plate`
    \`\`\`json
    ${JSON.stringify(val, null, 2)}
    \`\`\`
    `;
  }

  signature(ref: Schema.SignatureReflection): string {
    const { type, parameters } = ref;
    return plate`
    ${this.comment(ref.comment)}
    
    Returns: <code>${this.md.stringify(type!)}</code>

    Arguments: ${!parameters?.length && 'none'}

    ${parameters?.map((p) => this.param(p)).join(os.EOL + os.EOL)}
    `;
  }

  param(ref: Schema.ParameterReflection) {
    return `\`${this.paramName(ref)}\`: <code>${this.md.stringify(ref.type!)}</code>`;
  }

  paramName(ref: Schema.ParameterReflection) {
    const { name } = ref;
    return name === '__namedParameters' ? 'options' : name;
  }

  method(ref: Schema.DeclarationReflection): string {
    const signature = ref.signatures?.[ref.signatures.length - 1];
    const args = `(${
      signature?.parameters
        ?.map((p) => (p.flags.isOptional ? `\\[${this.paramName(p)}\\]` : this.paramName(p)))
        .join(', ') ?? ''
    })`;
    return plate`
    ### [${ref.name.replace('[', '\\[').replace(']', '\\]')}${args}](${ref.sources?.[0]?.url})
    ${this.comment(ref.comment)}

    ${ref?.signatures ? this.signature(ref.signatures[ref.signatures.length - 1]) : ''}
    `;
  }

  property(ref: Schema.DeclarationReflection, options?: StringifyOptions): string {
    const { level = 3 } = { ...options };
    const template = (nodes: (Schema.DeclarationReflection | Schema.SignatureReflection)[]): string => {
      return plate`
      ${pounds(level)} [${ref.name}](${ref.sources?.[0]?.url})
      Type: <code>${nodes
        .filter(Boolean)
        .map((t) => `${this.md.stringify(t.type!)}`)
        .join(', ')}</code>
      
      ${nodes
        .filter(Boolean)
        .map((node) => this.comment(node.comment))
        .join(os.EOL + os.EOL)}
      `;
    };
    return template(ref.kind === ReflectionKind.Accessor ? [ref.getSignature!, ref.setSignature!] : [ref]);
  }

  propertyRow(ref: Schema.DeclarationReflection): string {
    const template = (nodes: (Schema.DeclarationReflection | Schema.SignatureReflection)[]): string => {
      return plate`
      | [**${ref.name}**](${ref.sources?.[0]?.url}) <br /><br /> ${nodes
        .filter(Boolean)
        .map((t) => this.md.stringify(t.type!))
        .join(', ')} | ${nodes
        .filter(Boolean)
        .map((node) => this.comment(node.comment))
        .join('<br/>')} |
      `;
    };
    return template(ref.kind === ReflectionKind.Accessor ? [ref.getSignature!, ref.setSignature!] : [ref]);
  }

  table(options: { headers: string[]; alignment?: Alignment[]; rows?: string[] }): string {
    const { headers, rows = [], alignment } = options;
    const headerSeparatorMap: { [key in Alignment]: string } = {
      left: ':--',
      right: '--:',
      center: ':-:',
    };
    return [
      `|${headers.join('|')}|`,
      `|${headers.map((_h, i) => headerSeparatorMap[alignment ? alignment[i] : 'left']).join('|')}|`,
      ...rows.filter(Boolean),
    ].join(os.EOL);
  }

  declaration(declaration: Schema.DeclarationReflection) {}

  type(atype: Schema.DeclarationReflection, options?: StringifyOptions) {
    const {
      title = !options?.subset,
      headers = !options?.subset,
      sources = !options?.subset,
      comment = !options?.subset,
      subset,
      level = 1,
    } = { ...options };

    const groups = atype.type?.type === 'reflection' ? atype.type?.declaration?.groups : [];
    const filteredGroups =
      (subset ? groups?.filter((g) => subset!.indexOf(g.title.toLowerCase() as ClassMemberKind) >= 0) : groups) ?? [];
    return plate`
      ${title && `${pounds(level)} Type \`${atype.name}\``}
      ${sources && this.sources(atype)}

      ${comment && this.comment(atype.comment)}

      ${
        !groups
          ? plate`
      \`\`\`ts
      type ${atype.name} = ${this.txt.type(atype.type!)}
      \`\`\``
          : plate`
      ${filteredGroups
        .map(
          (group) => plate`
      ${headers && `${pounds(level + 1)} ${group.title}`}
      ${group.children
        ?.map((child) =>
          atype.type?.type === 'reflection'
            ? this.stringify(reflectionById(atype.type.declaration!, child as any) as Schema.DeclarationReflection, {
                ...options,
                level: level + 2,
              })
            : '',
        )
        .join(os.EOL + os.EOL)}
      `,
        )
        .join(os.EOL + os.EOL)}
      `
      }
      `;
  }

  class(aclass: Schema.DeclarationReflection, options?: StringifyOptions): string {
    const hasSubset = !!options?.subset;
    const {
      title = !hasSubset,
      sources = !hasSubset,
      comment = !hasSubset,
      headers = !hasSubset,
      subset,
      style = 'list',
    } = { ...options };
    const constructors = reflectionsOfKind(aclass, ReflectionKind.Constructor) as Schema.DeclarationReflection[];
    const properties = reflectionsOfKind(aclass, ReflectionKind.Property, ReflectionKind.Accessor).filter(
      (r) => !r.flags.isPrivate,
    ) as Schema.DeclarationReflection[];
    const functions = reflectionsOfKind(aclass, ReflectionKind.Method, ReflectionKind.Function).filter(
      (r) => !r.flags.isPrivate,
    ) as Schema.DeclarationReflection[];
    return plate`
    ${title && `# Class \`${aclass.name}\``}
    ${sources && this.sources(aclass)}

    ${comment && this.comment(aclass.comment)}

    ${
      (!subset || subset.indexOf('constructors') >= 0) &&
      plate`
      ${headers && '## Constructors'}
      ${constructors.map((c) => this.method(c))}`
    }

    ${
      (!subset || subset.indexOf('properties') >= 0) &&
      plate`
      ${headers && '## Properties'}
      ${
        style === 'list'
          ? properties.map((p) => this.property(p))
          : this.table({
              headers: ['Name', 'Description'],
              alignment: ['left', 'left'],
              rows: properties.map((p) => this.propertyRow(p)),
            })
      }`
    }

    ${
      (!subset || subset.indexOf('methods') >= 0) &&
      plate`
      ${headers && '## Methods'}
      ${functions.map((f) => this.method(f))}`
    }
    `;
  }

  interface(node: Schema.DeclarationReflection, options?: StringifyOptions) {
    const sourceFileName = node?.sources?.[0]?.fileName;
    const properties = reflectionsOfKind(node, ReflectionKind.Property) as Schema.DeclarationReflection[];
    return plate`
      # Interface \`${node.name}\`
      > Declared in [\`${sourceFileName}\`]()

      ${this.comment(node.comment)}
      ## Properties
      ${properties.map((p) => this.property(p))}
    `;
  }

  stringify(node?: Schema.DeclarationReflection | null, options?: StringifyOptions): string {
    if (!node) {
      return '';
    }
    return node.kind === ReflectionKind.Class
      ? this.class(node, options)
      : node.kind === ReflectionKind.TypeAlias
        ? this.type(node, options)
        : node.kind === ReflectionKind.Property || node.kind === ReflectionKind.Accessor
          ? this.property(node, options)
          : node.kind === ReflectionKind.FunctionOrMethod ||
              node.kind === ReflectionKind.Function ||
              node.kind === ReflectionKind.Method
            ? this.method(node)
            : node.kind === ReflectionKind.Interface
              ? this.interface(node, options)
              : process.env.DEBUG
                ? JSON.stringify(node, null, 2)
                : '';
  }
}
