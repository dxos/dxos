//
// Copyright 2022 DXOS.org
//
import os from 'os';
import { ReflectionKind } from 'typedoc';
import { text } from '@dxos/plate';
import { MdTypeStringifier } from './MdTypeStringifier.js';
import { TypeStringifier } from './TypeStringifier.js';
import { reflectionById, reflectionsOfKind } from './utils.js';
const tabs = (i = 0) => new Array(i).fill('  ').join('');
const pounds = (n) => new Array(n).fill('#').join('');
export class Stringifier {
    constructor(root) {
        this.root = root;
        this.md = new MdTypeStringifier(this.root);
        this.txt = new TypeStringifier(this.root);
    }
    children(ref, kind) {
        var _a;
        return kind ? reflectionsOfKind(ref, kind) : (_a = ref.children) !== null && _a !== void 0 ? _a : [];
    }
    href(ref) {
        var _a;
        if (ref.kind === ReflectionKind.Class) {
            const [source] = (_a = ref.sources) !== null && _a !== void 0 ? _a : [];
            return source ? `${source.url}` : '.';
        }
        else {
            return '.';
        }
    }
    generic(ref, indent = 0) {
        return text `
    ${tabs(indent)}- ${ref.name} : ${ref.kindString}
    ${this.children(ref).map((e) => this.generic(e, indent + 1))}
    `;
    }
    sources(ref) {
        const { sources } = ref;
        return (sources === null || sources === void 0 ? void 0 : sources.length)
            ? '<sub>Declared in ' +
                (sources === null || sources === void 0 ? void 0 : sources.map((source) => { var _a; return `[${source.fileName}:${source.line}](${(_a = source.url) !== null && _a !== void 0 ? _a : ''})`; }).join(' and ')) +
                '</sub>' +
                os.EOL
            : '';
    }
    comment(comment) {
        var _a;
        return text `${(_a = comment === null || comment === void 0 ? void 0 : comment.summary) === null || _a === void 0 ? void 0 : _a.map((s) => s.text).join(' ')}`;
    }
    json(val) {
        return text `
    \`\`\`json
    ${JSON.stringify(val, null, 2)}
    \`\`\`
    `;
    }
    signature(ref) {
        const { type, parameters } = ref;
        return text `
    ${this.comment(ref.comment)}
    
    Returns: <code>${this.md.stringify(type)}</code>

    Arguments: ${!(parameters === null || parameters === void 0 ? void 0 : parameters.length) && 'none'}

    ${parameters === null || parameters === void 0 ? void 0 : parameters.map((p) => this.param(p)).join(os.EOL + os.EOL)}
    `;
    }
    param(ref) {
        return `\`${this.paramName(ref)}\`: <code>${this.md.stringify(ref.type)}</code>`;
    }
    paramName(ref) {
        const { name } = ref;
        return name === '__namedParameters' ? 'options' : name;
    }
    method(ref) {
        var _a, _b, _c, _d, _e, _f;
        const signature = (_a = ref.signatures) === null || _a === void 0 ? void 0 : _a[ref.signatures.length - 1];
        const args = `(${(_c = (_b = signature === null || signature === void 0 ? void 0 : signature.parameters) === null || _b === void 0 ? void 0 : _b.map((p) => (p.flags.isOptional ? `\\[${this.paramName(p)}\\]` : this.paramName(p))).join(', ')) !== null && _c !== void 0 ? _c : ''})`;
        return text `
    ### [${ref.name.replace('[', '\\[').replace(']', '\\]')}${args}](${(_e = (_d = ref.sources) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.url})
    ${this.comment(ref.comment)}

    ${(_f = ref.signatures) === null || _f === void 0 ? void 0 : _f.map((s) => this.signature(s))}
    `;
    }
    property(ref, options) {
        const { level = 3 } = { ...options };
        const template = (nodes) => {
            var _a, _b;
            return text `
      ${pounds(level)} [${ref.name}](${(_b = (_a = ref.sources) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url})
      Type: <code>${nodes
                .filter(Boolean)
                .map((t) => `${this.md.stringify(t.type)}`)
                .join(', ')}</code>
      
      ${nodes
                .filter(Boolean)
                .map((node) => this.comment(node.comment))
                .join(os.EOL + os.EOL)}
      `;
        };
        return template(ref.kind === ReflectionKind.Accessor ? [ref.getSignature, ref.setSignature] : [ref]);
    }
    propertyRow(ref) {
        const template = (nodes) => {
            var _a, _b;
            return text `
      | [**${ref.name}**](${(_b = (_a = ref.sources) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url}) <br /><br /> ${nodes
                .filter(Boolean)
                .map((t) => this.md.stringify(t.type))
                .join(', ')} | ${nodes
                .filter(Boolean)
                .map((node) => this.comment(node.comment))
                .join('<br/>')} |
      `;
        };
        return template(ref.kind === ReflectionKind.Accessor ? [ref.getSignature, ref.setSignature] : [ref]);
    }
    table(options) {
        const { headers, rows = [], alignment } = options;
        const headerSeparatorMap = {
            left: ':--',
            right: '--:',
            center: ':-:'
        };
        return [
            `|${headers.join('|')}|`,
            `|${headers.map((_h, i) => headerSeparatorMap[alignment ? alignment[i] : 'left']).join('|')}|`,
            ...rows.filter(Boolean)
        ].join(os.EOL);
    }
    declaration(declaration) { }
    type(atype, options) {
        var _a, _b, _c, _d;
        const { title = !(options === null || options === void 0 ? void 0 : options.subset), headers = !(options === null || options === void 0 ? void 0 : options.subset), sources = !(options === null || options === void 0 ? void 0 : options.subset), comment = !(options === null || options === void 0 ? void 0 : options.subset), subset, level = 1 } = { ...options };
        const groups = ((_a = atype.type) === null || _a === void 0 ? void 0 : _a.type) === 'reflection' ? (_c = (_b = atype.type) === null || _b === void 0 ? void 0 : _b.declaration) === null || _c === void 0 ? void 0 : _c.groups : [];
        const filteredGroups = (_d = (subset ? groups === null || groups === void 0 ? void 0 : groups.filter((g) => subset.indexOf(g.title.toLowerCase()) >= 0) : groups)) !== null && _d !== void 0 ? _d : [];
        return text `
      ${title && `${pounds(level)} Type \`${atype.name}\``}
      ${sources && this.sources(atype)}

      ${comment && this.comment(atype.comment)}

      ${!groups
            ? text `
      \`\`\`ts
      type ${atype.name} = ${this.txt.type(atype.type)}
      \`\`\``
            : text `
      ${filteredGroups
                .map((group) => {
                var _a;
                return text `
      ${headers && `${pounds(level + 1)} ${group.title}`}
      ${(_a = group.children) === null || _a === void 0 ? void 0 : _a.map((child) => {
                    var _a;
                    return ((_a = atype.type) === null || _a === void 0 ? void 0 : _a.type) === 'reflection'
                        ? this.stringify(reflectionById(atype.type.declaration, child), { ...options, level: level + 2 })
                        : '';
                }).join(os.EOL + os.EOL)}
      `;
            })
                .join(os.EOL + os.EOL)}
      `}
      `;
    }
    class(aclass, options) {
        const hasSubset = !!(options === null || options === void 0 ? void 0 : options.subset);
        const { title = !hasSubset, sources = !hasSubset, comment = !hasSubset, headers = !hasSubset, subset, style = 'list' } = { ...options };
        const constructors = reflectionsOfKind(aclass, ReflectionKind.Constructor);
        const properties = reflectionsOfKind(aclass, ReflectionKind.Property, ReflectionKind.Accessor).filter((r) => !r.flags.isPrivate);
        const functions = reflectionsOfKind(aclass, ReflectionKind.Method, ReflectionKind.Function).filter((r) => !r.flags.isPrivate);
        return text `
    ${title && `# Class \`${aclass.name}\``}
    ${sources && this.sources(aclass)}

    ${comment && this.comment(aclass.comment)}

    ${(!subset || subset.indexOf('constructors') >= 0) &&
            text `
      ${headers && '## Constructors'}
      ${constructors.map((c) => this.method(c))}`}

    ${(!subset || subset.indexOf('properties') >= 0) &&
            text `
      ${headers && '## Properties'}
      ${style === 'list'
                ? properties.map((p) => this.property(p))
                : this.table({
                    headers: ['Name', 'Description'],
                    alignment: ['left', 'left'],
                    rows: properties.map((p) => this.propertyRow(p))
                })}`}

    ${(!subset || subset.indexOf('methods') >= 0) &&
            text `
      ${headers && '## Methods'}
      ${functions.map((f) => this.method(f))}`}
    `;
    }
    interface(node, options) {
        var _a, _b;
        const sourceFileName = (_b = (_a = node === null || node === void 0 ? void 0 : node.sources) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.fileName;
        const properties = reflectionsOfKind(node, ReflectionKind.Property);
        return text `
      # Interface \`${node.name}\`
      > Declared in [\`${sourceFileName}\`]()

      ${this.comment(node.comment)}
      ## Properties
      ${properties.map((p) => this.property(p))}
    `;
    }
    stringify(node, options) {
        if (!node) {
            return '';
        }
        return node.kind === ReflectionKind.Class
            ? this.class(node, options)
            : node.kind === ReflectionKind.TypeAlias
                ? this.type(node, options)
                : node.kind === ReflectionKind.Property
                    ? this.property(node, options)
                    : node.kind === ReflectionKind.FunctionOrMethod || node.kind === ReflectionKind.Function
                        ? this.method(node)
                        : node.kind === ReflectionKind.Interface
                            ? this.interface(node, options)
                            : '';
    }
}
//# sourceMappingURL=Stringifier.js.map