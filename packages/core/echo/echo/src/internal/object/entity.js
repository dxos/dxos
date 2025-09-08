"use strict";
//
// Copyright 2024 DXOS.org
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoRelation = exports.EchoObject = void 0;
var effect_1 = require("effect");
var debug_1 = require("@dxos/debug");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(dmaretskyi): Rename EchoObjectSchema.
var EchoObject = function (_a) {
    var typename = _a.typename, version = _a.version;
    return function (self) {
        var _a;
        (0, invariant_1.invariant)(typeof ast_1.TypeAnnotationId === 'symbol', 'Sanity.');
        (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');
        // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
        // TODO(dmaretskyi): Do not do mutable here.
        var schemaWithId = effect_1.Schema.extend(effect_1.Schema.mutable(self), effect_1.Schema.Struct({ id: effect_1.Schema.String }));
        var ast = effect_1.SchemaAST.annotations(schemaWithId.ast, __assign(__assign({}, self.ast.annotations), (_a = {}, _a[ast_1.TypeAnnotationId] = { kind: ast_1.EntityKind.Object, typename: typename, version: version }, _a)));
        return makeEchoObjectSchema(/* self.fields, */ ast, typename, version);
    };
};
exports.EchoObject = EchoObject;
// TODO(dmaretskyi): Rename EchoRelationSchema.
var EchoRelation = function (options) {
    var sourceDXN = getDXNForRelationSchemaRef(options.source);
    var targetDXN = getDXNForRelationSchemaRef(options.target);
    if ((0, ast_1.getEntityKind)(options.source) !== ast_1.EntityKind.Object) {
        (0, debug_1.raise)(new Error('Source schema must be an echo object schema.'));
    }
    if ((0, ast_1.getEntityKind)(options.target) !== ast_1.EntityKind.Object) {
        (0, debug_1.raise)(new Error('Target schema must be an echo object schema.'));
    }
    return function (self) {
        var _a;
        (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');
        // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
        // TODO(dmaretskyi): Do not do mutable here.
        var schemaWithId = effect_1.Schema.extend(effect_1.Schema.mutable(self), effect_1.Schema.Struct({ id: effect_1.Schema.String }));
        var ast = effect_1.SchemaAST.annotations(schemaWithId.ast, __assign(__assign({}, self.ast.annotations), (_a = {}, _a[ast_1.TypeAnnotationId] = {
            kind: ast_1.EntityKind.Relation,
            typename: options.typename,
            version: options.version,
            sourceSchema: sourceDXN,
            targetSchema: targetDXN,
        }, _a)));
        return makeEchoObjectSchema(/* self.fields, */ ast, options.typename, options.version);
    };
};
exports.EchoRelation = EchoRelation;
var getDXNForRelationSchemaRef = function (schema) {
    var identifier = (0, ast_1.getTypeIdentifierAnnotation)(schema);
    if (identifier) {
        return identifier;
    }
    var typename = (0, ast_1.getSchemaTypename)(schema);
    if (!typename) {
        throw new Error('Schema must have a typename');
    }
    return keys_1.DXN.fromTypename(typename).toString();
};
// type MakeOptions =
//   | boolean
//   | {
//       readonly disableValidation?: boolean;
//     };
// NOTE: Utils copied from Effect `Schema.ts`.
// const _ownKeys = (o: object): Array<PropertyKey> =>
//   (Object.keys(o) as Array<PropertyKey>).concat(Object.getOwnPropertySymbols(o));
// const _lazilyMergeDefaults = (
//   fields: Schema.Struct.Fields,
//   out: Record<PropertyKey, unknown>,
// ): { [x: string | symbol]: unknown } => {
//   const ownKeys = _ownKeys(fields);
//   for (const key of ownKeys) {
//     const field = fields[key];
//     if (out[key] === undefined && Schema.isPropertySignature(field)) {
//       const ast = field.ast;
//       const defaultValue = ast._tag === 'PropertySignatureDeclaration' ? ast.defaultValue : ast.to.defaultValue;
//       if (defaultValue !== undefined) {
//         out[key] = defaultValue();
//       }
//     }
//   }
//   return out;
// };
// const _getDisableValidationMakeOption = (options: MakeOptions | undefined): boolean =>
//   Predicate.isBoolean(options) ? options : options?.disableValidation ?? false;
var makeEchoObjectSchema = function (
// fields: Fields,
ast, typename, version) {
    var _a;
    return _a = /** @class */ (function (_super) {
            __extends(EchoObjectSchemaClass, _super);
            function EchoObjectSchemaClass() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            EchoObjectSchemaClass.annotations = function (annotations) {
                var schema = effect_1.Schema.make(ast).annotations(annotations);
                return makeEchoObjectSchema(/* fields, */ schema.ast, typename, version);
            };
            // static make(
            //   props: RequiredKeys<Schema.TypeLiteral.Constructor<Fields, []>> extends never
            //     ? void | Simplify<Schema.TypeLiteral.Constructor<Fields, []>>
            //     : Simplify<Schema.TypeLiteral.Constructor<Fields, []>>,
            //   options?: MakeOptions,
            // ): Simplify<Schema.TypeLiteral.Type<Fields, []>> {
            //   const propsWithDefaults: any = _lazilyMergeDefaults(fields, { ...(props as any) });
            //   return _getDisableValidationMakeOption(options)
            //     ? propsWithDefaults
            //     : ParseResult.validateSync(this)(propsWithDefaults);
            // }
            EchoObjectSchemaClass.instanceOf = function (value) {
                return effect_1.Schema.is(this)(value);
            };
            return EchoObjectSchemaClass;
        }(effect_1.Schema.make(ast))),
        _a.typename = typename,
        _a.version = version,
        _a;
};
