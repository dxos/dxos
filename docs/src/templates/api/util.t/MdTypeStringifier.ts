//
// Copyright 2022 DXOS.org
//

import { JSONOutput as Schema, ReflectionKind } from 'typedoc';

import { packageOfReflectionId, reflectionById } from './utils';

type AnyTypeName = keyof Schema.TypeKindMap;

declare module 'typedoc' {
  export namespace JSONOutput {
    export interface Type {
      type: AnyTypeName;
    }
  }
}

export type AllStringifiers = {
  [K in keyof Schema.TypeKindMap]: (node: Schema.TypeKindMap[K]) => string;
};

export class MdTypeStringifier implements AllStringifiers {
  constructor(public readonly root: Schema.Reflection) {}
  /**
   * Return a string representation of the given type.
   */
  stringify(node: Schema.SomeType): string {
    return `\`${this.type(node)}\``.replace(/`\s*`/gi, '');
  }

  type(node: Schema.SomeType): string {
    if (!(node?.type in this)) {
      throw new TypeError(`Cannot stringify type '${node.type}'`);
    }
    return this[node.type](node as any);
  }

  array(node: Schema.ArrayType): string {
    const elementTypeStr = this.type(node.elementType);
    if (node.elementType.type === 'union' || node.elementType.type === 'intersection') {
      return `(${elementTypeStr})[]`;
    } else {
      return `${elementTypeStr}[]`;
    }
  }

  list(list: Schema.Type[], separator: string): string {
    return list.map((t) => this.type(t)).join(separator);
  }

  conditional(node: Schema.ConditionalType): string {
    return `${node.checkType} extends ${node.extendsType} ? ${node.trueType} : ${node.falseType}`;
  }

  indexedAccess(node: Schema.IndexedAccessType) {
    return `${this.type(node.objectType)}[${this.type(node.indexType)}]`;
  }

  inferred(node: Schema.InferredType): string {
    return `infer ${node.name}`;
  }

  intersection(node: Schema.IntersectionType): string {
    return this.list(node.types, ' & ');
  }

  intrinsic(node: Schema.IntrinsicType): string {
    return node.name;
  }

  predicate(node: Schema.PredicateType): string {
    const out = node.asserts ? ['asserts', node.name] : [node.name];
    if (node.targetType) {
      out.push('is', this.type(node.targetType));
    }
    return out.join(' ');
  }

  query(node: Schema.QueryType): string {
    return `typeof ${this.type(node.queryType)}`;
  }

  reference(node: Schema.ReferenceType): string {
    const name = node.name;
    let typeArgs = '';
    if (node.typeArguments) {
      typeArgs += '<';
      typeArgs += this.list(node.typeArguments, ', ');
      typeArgs += '>';
    }
    let href = '';
    if (node.id) {
      const referencedNode = reflectionById(this.root, node.id);
      const referencedPackage = packageOfReflectionId(this.root, node.id);
      if (referencedNode?.kind === ReflectionKind.Class) {
        href = `/api/${referencedPackage?.name}/classes/${referencedNode?.name}`;
      } else if (referencedNode?.kind === ReflectionKind.TypeAlias) {
        href = `/api/${referencedPackage?.name}/types/${referencedNode?.name}`;
      } else if (referencedNode?.kind === ReflectionKind.Function) {
        href = `/api/${referencedPackage?.name}/functions/${referencedNode?.name}`;
      } else if (referencedNode?.kind === ReflectionKind.Interface) {
        href = `/api/${referencedPackage?.name}/interfaces/${referencedNode?.name}`;
      } else if (referencedNode?.kind === ReflectionKind.Enum) {
        href = `/api/${referencedPackage?.name}/enums#${referencedNode.name}`;
      } else if (referencedNode?.kind === ReflectionKind.Variable) {
        href = `/api/${referencedPackage?.name}/values#${referencedNode.name}`;
      }
      // if (!!referencedNode && !!referencedPackage)
      //   console.log(
      //     referencedNode.kind,
      //     referencedNode.kindString,
      //     referencedNode.name,
      //     referencedPackage.name,
      //     { href }
      //   );
    }
    return (href ? `\`[\`${name}\`](${href})\`` : `${name}`) + typeArgs;
  }

  reflection(node: Schema.ReflectionType): string {
    if (!node.declaration?.children && node.declaration?.signatures) {
      return 'function';
    } else {
      return 'object';
    }
  }

  literal(node: Schema.LiteralType): string {
    return `"${node.value}"`;
  }

  tuple(node: Schema.TupleType): string {
    return node?.elements ? `[${this.list(node.elements, ', ')}]` : '';
  }

  typeOperator(node: Schema.TypeOperatorType): string {
    return `${node.operator} ${this.type(node.target)}`;
  }

  union(node: Schema.UnionType): string {
    return this.list(node.types, ' | ');
  }

  unknown(node: Schema.UnknownType): string {
    return `${node.name}`;
  }

  void(): string {
    return 'void';
  }

  mapped(node: Schema.MappedType): string {
    return '{mapped type}';
  }

  optional(node: Schema.OptionalType): string {
    return `${this.type(node.elementType)}?`;
  }

  rest(node: Schema.RestType): string {
    return `...${this.type(node.elementType)}`;
  }

  'template-literal'(node: Schema.TemplateLiteralType): string {
    const { head, tail } = node;
    return [
      head,
      ...tail.map(([type, text]) => {
        return '${' + this.type(type) + '}' + text;
      })
    ].join('');
  }

  'named-tuple-member'(node: Schema.NamedTupleMemberType): string {
    const { name, isOptional, element } = node;
    return `${name}${isOptional ? '?' : ''}: ${this.type(element)}`;
  }

  callSignature(node: Schema.SignatureReflection, name = '') {
    const { parameters = [], typeParameter: typeParameters = [], type } = node;

    const types = typeParameters.map((t) => t.name).join(', ');

    const params = parameters
      .map((p) => {
        const type = p.type ? ': ' + this.type(p.type) : '';
        return `${p.flags.isRest ? '...' : ''}${p.name}${type}`;
      })
      .join(', ');

    const returns = type ? this.type(type) : '';

    const returnToken = name === '' ? ' => ' : ': ';
    const typeParams = types === '' ? '' : ' <' + types + '>';

    return `${name}${typeParams} (${params})${returnToken}${returns}`;
  }
}
