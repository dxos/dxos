//
// Copyright 2022 DXOS.org
//
import { ReflectionKind } from 'typedoc';
import { packageOfReflectionId, reflectionById } from './utils.js';
export class MdTypeStringifier {
    constructor(root) {
        this.root = root;
    }
    /**
     * Return a string representation of the given type.
     */
    stringify(node) {
        return `${this.type(node)}`.replace(/`\s*`/gi, '');
    }
    type(node) {
        if (!((node === null || node === void 0 ? void 0 : node.type) in this)) {
            throw new TypeError(`Cannot stringify type '${node.type}'`);
        }
        return this[node.type](node);
    }
    array(node) {
        const elementTypeStr = this.type(node.elementType);
        if (node.elementType.type === 'union' || node.elementType.type === 'intersection') {
            return `(${elementTypeStr})[]`;
        }
        else {
            return `${elementTypeStr}[]`;
        }
    }
    list(list, separator) {
        return list.map((t) => this.type(t)).join(separator);
    }
    conditional(node) {
        return `${node.checkType} extends ${node.extendsType} ? ${node.trueType} : ${node.falseType}`;
    }
    indexedAccess(node) {
        return `${this.type(node.objectType)}[${this.type(node.indexType)}]`;
    }
    inferred(node) {
        return `infer ${node.name}`;
    }
    intersection(node) {
        return this.list(node.types, ' & ');
    }
    intrinsic(node) {
        return node.name;
    }
    predicate(node) {
        const out = node.asserts ? ['asserts', node.name] : [node.name];
        if (node.targetType) {
            out.push('is', this.type(node.targetType));
        }
        return out.join(' ');
    }
    query(node) {
        return `typeof ${this.type(node.queryType)}`;
    }
    reference(node) {
        const name = node.name;
        let typeArgs = '';
        if (node.typeArguments) {
            typeArgs += '&lt;';
            typeArgs += this.list(node.typeArguments, ', ');
            typeArgs += '&gt;';
        }
        let href = '';
        if (node.id) {
            const referencedNode = reflectionById(this.root, node.id);
            const referencedPackage = packageOfReflectionId(this.root, node.id);
            if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.Class) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/classes/${referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.name}`;
            }
            else if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.TypeAlias) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/types/${referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.name}`;
            }
            else if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.Function) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/functions/${referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.name}`;
            }
            else if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.Interface) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/interfaces/${referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.name}`;
            }
            else if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.Enum) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/enums#${referencedNode.name}`;
            }
            else if ((referencedNode === null || referencedNode === void 0 ? void 0 : referencedNode.kind) === ReflectionKind.Variable) {
                href = `/api/${referencedPackage === null || referencedPackage === void 0 ? void 0 : referencedPackage.name}/values#${referencedNode.name}`;
            }
        }
        return (href ? `[${name}](${href})` : `${name}`) + typeArgs;
    }
    reflection(node) {
        var _a, _b;
        if (!((_a = node.declaration) === null || _a === void 0 ? void 0 : _a.children) && ((_b = node.declaration) === null || _b === void 0 ? void 0 : _b.signatures)) {
            return 'function';
        }
        else {
            return 'object';
        }
    }
    literal(node) {
        return `"${node.value}"`;
    }
    tuple(node) {
        return (node === null || node === void 0 ? void 0 : node.elements) ? `[${this.list(node.elements, ', ')}]` : '';
    }
    typeOperator(node) {
        return `${node.operator} ${this.type(node.target)}`;
    }
    union(node) {
        return this.list(node.types, ' | ');
    }
    unknown(node) {
        return `${node.name}`;
    }
    void() {
        return 'void';
    }
    mapped(node) {
        return '{mapped type}';
    }
    optional(node) {
        return `${this.type(node.elementType)}?`;
    }
    rest(node) {
        return `...${this.type(node.elementType)}`;
    }
    'template-literal'(node) {
        const { head, tail } = node;
        return [
            head,
            ...tail.map(([type, text]) => {
                return '${' + this.type(type) + '}' + text;
            })
        ].join('');
    }
    'named-tuple-member'(node) {
        const { name, isOptional, element } = node;
        return `${name}${isOptional ? '?' : ''}: ${this.type(element)}`;
    }
    callSignature(node, name = '') {
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
//# sourceMappingURL=MdTypeStringifier.js.map