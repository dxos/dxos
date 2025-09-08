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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoSchema = exports.isMutable = exports.ImmutableSchema = void 0;
var effect_1 = require("effect");
var invariant_1 = require("@dxos/invariant");
var ast_1 = require("../ast");
var json_1 = require("../json");
var manipulation_1 = require("./manipulation");
var snapshot_1 = require("./snapshot");
var stored_schema_1 = require("./stored-schema");
/**
 * Immutable schema type.
 * @deprecated Use `Schema.Schema.AnyNoContext` instead.
 */
// TODO(burdon): Common abstract base class?
var ImmutableSchema = /** @class */ (function () {
    function ImmutableSchema(_schema) {
        this._schema = _schema;
        this._objectAnnotation = (0, ast_1.getTypeAnnotation)(this._schema);
        (0, invariant_1.invariant)(this._objectAnnotation);
    }
    Object.defineProperty(ImmutableSchema.prototype, effect_1.Schema.TypeId, {
        //
        // Effect Schema (push to abstract base class).
        //
        get: function () {
            return schemaVariance;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "Type", {
        get: function () {
            return this._schema.Type;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "Encoded", {
        get: function () {
            return this._schema.Encoded;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "Context", {
        get: function () {
            return this._schema.Context;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "ast", {
        get: function () {
            return this._schema.ast;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "annotations", {
        get: function () {
            return this._schema.annotations;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "pipe", {
        get: function () {
            return this._schema.pipe;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "typename", {
        //
        // TypedObject
        //
        get: function () {
            return this._objectAnnotation.typename;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "version", {
        get: function () {
            return this._objectAnnotation.version;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "readonly", {
        //
        // BaseSchema
        //
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "snapshot", {
        get: function () {
            return this._schema;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "jsonSchema", {
        // TODO(burdon): Change from getter since this is expensive.
        get: function () {
            return (0, json_1.toJsonSchema)(this._schema);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ImmutableSchema.prototype, "mutable", {
        get: function () {
            throw new Error('Schema is readonly.');
        },
        enumerable: false,
        configurable: true
    });
    return ImmutableSchema;
}());
exports.ImmutableSchema = ImmutableSchema;
/**
 * Defines an effect-schema for the `EchoSchema` type.
 *
 * This is here so that `EchoSchema` class can be used as a part of another schema definition (e.g., `ref(EchoSchema)`).
 */
var EchoSchemaConstructor = function () {
    var _a, _b;
    /**
     * Return class definition satisfying Schema.Schema.
     */
    return _b = /** @class */ (function () {
            function class_1() {
            }
            Object.defineProperty(class_1, "_schema", {
                get: function () {
                    // The field is DynamicEchoSchema in runtime, but is serialized as StoredEchoSchema in automerge.
                    return effect_1.Schema.Union(stored_schema_1.StoredSchema, effect_1.Schema.instanceOf(EchoSchema)).annotations(stored_schema_1.StoredSchema.ast.annotations);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(class_1, "ast", {
                get: function () {
                    var schema = this._schema;
                    return schema.ast;
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(class_1, "annotations", {
                get: function () {
                    var schema = this._schema;
                    return schema.annotations.bind(schema);
                },
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(class_1, "pipe", {
                get: function () {
                    var schema = this._schema;
                    return schema.pipe.bind(schema);
                },
                enumerable: false,
                configurable: true
            });
            return class_1;
        }()),
        _a = effect_1.Schema.TypeId,
        _b[_a] = schemaVariance,
        _b;
};
var isMutable = function (schema) {
    return schema instanceof EchoSchema;
};
exports.isMutable = isMutable;
// NOTE: Keep in this file.
var schemaVariance = {
    _A: function (_) { return _; },
    _I: function (_) { return _; },
    _R: function (_) { return _; },
};
/**
 * Represents a schema that is stored in the ECHO database.
 * Schema can me mutable or readonly (specified by the {@link EchoSchema.readonly} field).
 *
 * Schema that can be modified at runtime via the API.
 * Is an instance of effect-schema (`Schema.Schema.AnyNoContext`) so it can be used in the same way as a regular schema.
 * IMPORTANT: The schema AST will change reactively when the schema is updated, including synced updates from remote peers.
 *
 * The class constructor is a schema instance itself, and can be used in the echo object definitions:
 *
 * @example
 * ```ts
 * export class TableType extends TypedObject({ typename: 'example.org/type/Table', version: '0.1.0' })({
 *   title: Schema.String,
 *   schema: Schema.optional(ref(EchoSchema)),
 *   props: Schema.mutable(S.Array(TablePropSchema)),
 * }) {}
 * ```
 *
 * The ECHO API will translate any references to StoredSchema objects to be resolved as EchoSchema objects.
 */
var EchoSchema = /** @class */ (function (_super) {
    __extends(EchoSchema, _super);
    function EchoSchema(_storedSchema) {
        var _this = _super.call(this) || this;
        _this._storedSchema = _storedSchema;
        _this._isDirty = true;
        return _this;
    }
    Object.defineProperty(EchoSchema.prototype, effect_1.Schema.TypeId, {
        //
        // Effect Schema (push to abstract base class).
        //
        get: function () {
            return schemaVariance;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "Type", {
        get: function () {
            return this._storedSchema;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "Encoded", {
        get: function () {
            return this._storedSchema;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "Context", {
        get: function () {
            var schema = this._getSchema();
            return schema.Context;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "ast", {
        get: function () {
            var schema = this._getSchema();
            return schema.ast;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "annotations", {
        get: function () {
            var schema = this._getSchema();
            return schema.annotations.bind(schema);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "pipe", {
        get: function () {
            var schema = this._getSchema();
            return schema.pipe.bind(schema);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "typename", {
        //
        // BaseSchema
        //
        get: function () {
            return this._storedSchema.typename;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "version", {
        get: function () {
            return this._storedSchema.version;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "readonly", {
        get: function () {
            return false;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "snapshot", {
        /**
         * Returns an immutable schema snapshot of the current state of the schema.
         */
        get: function () {
            return this._getSchema();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "jsonSchema", {
        /**
         * @reactive
         */
        get: function () {
            return this._storedSchema.jsonSchema;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "mutable", {
        /**
         * Returns a mutable schema.
         */
        get: function () {
            (0, invariant_1.invariant)(!this.readonly, 'Schema is not mutable');
            return this;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "id", {
        //
        // Mutable Schema
        //
        /**
         * Id of the ECHO object containing the schema.
         */
        get: function () {
            return this._storedSchema.id;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "name", {
        /**
         * Short name of the schema.
         */
        get: function () {
            return this._storedSchema.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, ast_1.SchemaMetaSymbol, {
        get: function () {
            return { id: this.id, typename: this.typename, version: this._storedSchema.version };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EchoSchema.prototype, "storedSchema", {
        /**
         * Reference to the underlying stored schema object.
         */
        get: function () {
            return this._storedSchema;
        },
        enumerable: false,
        configurable: true
    });
    EchoSchema.prototype.getProperties = function () {
        var ast = this._getSchema().ast;
        (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(ast));
        return __spreadArray([], ast.propertySignatures, true).filter(function (p) { return p.name !== 'id'; }).map(unwrapOptionality);
    };
    //
    // Mutation methods.
    // TODO(burdon): Create separate interface for dynamic schema.
    // TODO(burdon): Deprecate direct manipulation? Use JSONSchema directly.
    //
    /**
     * @throws Error if the schema is readonly.
     */
    EchoSchema.prototype.updateTypename = function (typename) {
        var updated = (0, manipulation_1.setTypenameInSchema)(this._getSchema(), typename);
        this._storedSchema.typename = typename;
        this._storedSchema.jsonSchema = (0, json_1.toJsonSchema)(updated);
    };
    /**
     * @throws Error if the schema is readonly.
     */
    EchoSchema.prototype.addFields = function (fields) {
        var extended = (0, manipulation_1.addFieldsToSchema)(this._getSchema(), fields);
        this._storedSchema.jsonSchema = (0, json_1.toJsonSchema)(extended);
    };
    /**
     * @throws Error if the schema is readonly.
     */
    EchoSchema.prototype.updateFields = function (fields) {
        var updated = (0, manipulation_1.updateFieldsInSchema)(this._getSchema(), fields);
        this._storedSchema.jsonSchema = (0, json_1.toJsonSchema)(updated);
    };
    /**
     * @throws Error if the schema is readonly.
     */
    EchoSchema.prototype.updateFieldPropertyName = function (_a) {
        var before = _a.before, after = _a.after;
        var renamed = (0, manipulation_1.updateFieldNameInSchema)(this._getSchema(), { before: before, after: after });
        this._storedSchema.jsonSchema = (0, json_1.toJsonSchema)(renamed);
    };
    /**
     * @throws Error if the schema is readonly.
     */
    EchoSchema.prototype.removeFields = function (fieldNames) {
        var removed = (0, manipulation_1.removeFieldsFromSchema)(this._getSchema(), fieldNames);
        this._storedSchema.jsonSchema = (0, json_1.toJsonSchema)(removed);
    };
    //
    // Internals
    //
    /**
     * Called by EchoSchemaRegistry on update.
     */
    EchoSchema.prototype._invalidate = function () {
        this._isDirty = true;
    };
    /**
     * Rebuilds this schema if it is dirty.
     */
    EchoSchema.prototype._rebuild = function () {
        if (this._isDirty || this._schema == null) {
            this._schema = (0, json_1.toEffectSchema)((0, snapshot_1.getSnapshot)(this._storedSchema.jsonSchema));
            this._isDirty = false;
        }
    };
    EchoSchema.prototype._getSchema = function () {
        this._rebuild();
        return this._schema;
    };
    return EchoSchema;
}(EchoSchemaConstructor()));
exports.EchoSchema = EchoSchema;
// TODO(burdon): Move to effect.
var unwrapOptionality = function (property) {
    if (!effect_1.SchemaAST.isUnion(property.type)) {
        return property;
    }
    return __assign(__assign({}, property), { type: property.type.types.find(function (type) { return !effect_1.SchemaAST.isUndefinedKeyword(type); }) });
};
