"use strict";
//
// Copyright 2024 DXOS.org
//
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
exports.checkIdNotPresentOnSchema = exports.SchemaValidator = void 0;
var effect_1 = require("effect");
var invariant_1 = require("@dxos/invariant");
var model_1 = require("./model");
// TODO(burdon): Reconcile with @dxos/effect visit().
var SchemaValidator = /** @class */ (function () {
    function SchemaValidator() {
    }
    /**
     * Recursively check that schema specifies constructions we can handle.
     * Validates there are no ambiguous discriminated union types.
     */
    SchemaValidator.validateSchema = function (schema) {
        var _this = this;
        var visitAll = function (nodes) { return nodes.forEach(function (node) { return _this.validateSchema(effect_1.Schema.make(node)); }); };
        if (effect_1.SchemaAST.isUnion(schema.ast)) {
            var typeAstList = schema.ast.types.filter(function (type) { return effect_1.SchemaAST.isTypeLiteral(type); });
            // Check we can handle a discriminated union.
            if (typeAstList.length > 1) {
                getTypeDiscriminators(typeAstList);
            }
            visitAll(typeAstList);
        }
        else if (effect_1.SchemaAST.isTupleType(schema.ast)) {
            var positionalTypes = schema.ast.elements.map(function (t) { return t.type; });
            var allTypes = positionalTypes.concat(schema.ast.rest.map(function (t) { return t.type; }));
            visitAll(allTypes);
        }
        else if (effect_1.SchemaAST.isTypeLiteral(schema.ast)) {
            visitAll(effect_1.SchemaAST.getPropertySignatures(schema.ast).map(function (p) { return p.type; }));
        }
    };
    SchemaValidator.hasTypeAnnotation = function (rootObjectSchema, property, annotation) {
        try {
            var type = this.getPropertySchema(rootObjectSchema, [property]);
            if (effect_1.SchemaAST.isTupleType(type.ast)) {
                type = this.getPropertySchema(rootObjectSchema, [property, '0']);
            }
            return type.ast.annotations[annotation] != null;
        }
        catch (err) {
            return false;
        }
    };
    SchemaValidator.getPropertySchema = function (rootObjectSchema, propertyPath, getProperty) {
        if (getProperty === void 0) { getProperty = function () { return null; }; }
        var schema = rootObjectSchema;
        var _loop_1 = function (i) {
            var propertyName = propertyPath[i];
            var tupleAst = unwrapArray(schema.ast);
            if (tupleAst != null) {
                schema = getArrayElementSchema(tupleAst, propertyName);
            }
            else {
                var propertyType = getPropertyType(schema.ast, propertyName.toString(), function (propertyName) {
                    return getProperty(__spreadArray(__spreadArray([], propertyPath.slice(0, i), true), [propertyName], false));
                });
                if (propertyType == null) {
                    throw new TypeError("unknown property: ".concat(String(propertyName), " on object. Path: ").concat(propertyPath));
                }
                schema = effect_1.Schema.make(propertyType).annotations(propertyType.annotations);
            }
        };
        for (var i = 0; i < propertyPath.length; i++) {
            _loop_1(i);
        }
        return schema;
    };
    SchemaValidator.getTargetPropertySchema = function (target, prop) {
        var schema = target[model_1.SchemaId];
        (0, invariant_1.invariant)(schema, 'target has no schema');
        var arrayAst = unwrapArray(schema.ast);
        if (arrayAst != null) {
            return getArrayElementSchema(arrayAst, prop);
        }
        var propertyType = getPropertyType(schema.ast, prop.toString(), function (prop) { return target[prop]; });
        if (propertyType == null) {
            return effect_1.Schema.Any; // TODO(burdon): HACK.
        }
        (0, invariant_1.invariant)(propertyType, "invalid property: ".concat(prop.toString()));
        return effect_1.Schema.make(propertyType);
    };
    return SchemaValidator;
}());
exports.SchemaValidator = SchemaValidator;
/**
 * Tuple AST is used both for:
 * fixed-length tuples ([string, number]) in which case AST will be { elements: [Schema.String, Schema.Number] }
 * variable-length arrays (Array<string | number>) in which case AST will be { rest: [Schema.Union(Schema.String, Schema.Number)] }
 */
var getArrayElementSchema = function (tupleAst, property) {
    var elementIndex = typeof property === 'string' ? parseInt(property, 10) : Number.NaN;
    if (Number.isNaN(elementIndex)) {
        (0, invariant_1.invariant)(property === 'length', "invalid array property: ".concat(String(property)));
        return effect_1.Schema.Number;
    }
    if (elementIndex < tupleAst.elements.length) {
        var elementType = tupleAst.elements[elementIndex].type;
        return effect_1.Schema.make(elementType).annotations(elementType.annotations);
    }
    var restType = tupleAst.rest;
    return effect_1.Schema.make(restType[0].type).annotations(restType[0].annotations);
};
var flattenUnion = function (typeAst) {
    return effect_1.SchemaAST.isUnion(typeAst) ? typeAst.types.flatMap(flattenUnion) : [typeAst];
};
var getProperties = function (typeAst, getTargetPropertyFn) {
    var astCandidates = flattenUnion(typeAst);
    var typeAstList = astCandidates.filter(function (type) { return effect_1.SchemaAST.isTypeLiteral(type); });
    if (typeAstList.length === 0) {
        return [];
    }
    if (typeAstList.length === 1) {
        return effect_1.SchemaAST.getPropertySignatures(typeAstList[0]);
    }
    var typeDiscriminators = getTypeDiscriminators(typeAstList);
    var targetPropertyValue = getTargetPropertyFn(String(typeDiscriminators[0].name));
    var typeIndex = typeDiscriminators.findIndex(function (p) { return targetPropertyValue === p.type.literal; });
    (0, invariant_1.invariant)(typeIndex !== -1, 'discriminator field not set on target');
    return effect_1.SchemaAST.getPropertySignatures(typeAstList[typeIndex]);
};
var getPropertyType = function (ast, propertyName, getTargetPropertyFn) {
    var anyOrObject = unwrapAst(ast, function (candidate) { return effect_1.SchemaAST.isAnyKeyword(candidate) || effect_1.SchemaAST.isObjectKeyword(candidate); });
    if (anyOrObject != null) {
        return ast;
    }
    var typeOrDiscriminatedUnion = unwrapAst(ast, function (t) {
        return effect_1.SchemaAST.isTypeLiteral(t) || (effect_1.SchemaAST.isUnion(t) && t.types.some(function (t) { return effect_1.SchemaAST.isTypeLiteral(t); }));
    });
    if (typeOrDiscriminatedUnion == null) {
        return null;
    }
    var targetProperty = getProperties(typeOrDiscriminatedUnion, getTargetPropertyFn).find(function (p) { return p.name === propertyName; });
    if (targetProperty != null) {
        return unwrapAst(targetProperty.type);
    }
    var indexSignatureType = unwrapAst(ast, effect_1.SchemaAST.isTypeLiteral);
    if (indexSignatureType &&
        effect_1.SchemaAST.isTypeLiteral(indexSignatureType) &&
        indexSignatureType.indexSignatures.length > 0) {
        return unwrapAst(indexSignatureType.indexSignatures[0].type);
    }
    return null;
};
var getTypeDiscriminators = function (typeAstList) {
    var discriminatorPropCandidates = typeAstList
        .flatMap(effect_1.SchemaAST.getPropertySignatures)
        .filter(function (p) { return effect_1.SchemaAST.isLiteral(p.type); });
    var propertyName = discriminatorPropCandidates[0].name;
    var isValidDiscriminator = discriminatorPropCandidates.every(function (p) { return p.name === propertyName && !p.isOptional; });
    var everyTypeHasDiscriminator = discriminatorPropCandidates.length === typeAstList.length;
    var isDiscriminatedUnion = isValidDiscriminator && everyTypeHasDiscriminator;
    (0, invariant_1.invariant)(isDiscriminatedUnion, 'type ambiguity: every type in a union must have a single unique-literal field');
    return discriminatorPropCandidates;
};
/**
 * Used to check that rootAst is for a type matching the provided predicate.
 * That's not always straightforward because types of optionality and recursive types.
 * const Task = Schema.Struct({
 *   ...,
 *   previous?: Schema.optional(Schema.suspend(() => Task)),
 * });
 * Here the AST for `previous` field is going to be Union(Suspend(Type), Undefined).
 * SchemaAST.isTypeLiteral(field) will return false, but unwrapAst(field, (ast) => SchemaAST.isTypeLiteral(ast))
 * will return true.
 */
var unwrapAst = function (rootAst, predicate) {
    var ast = rootAst;
    while (ast != null) {
        if (predicate === null || predicate === void 0 ? void 0 : predicate(ast)) {
            return ast;
        }
        if (effect_1.SchemaAST.isUnion(ast)) {
            var next = ast.types.find(function (t) { return (predicate != null && predicate(t)) || effect_1.SchemaAST.isSuspend(t); });
            if (next != null) {
                ast = next;
                continue;
            }
        }
        if (effect_1.SchemaAST.isSuspend(ast)) {
            ast = ast.f();
        }
        else {
            return predicate == null ? ast : null;
        }
    }
    return null;
};
var unwrapArray = function (ast) { return unwrapAst(ast, effect_1.SchemaAST.isTupleType); };
var checkIdNotPresentOnSchema = function (schema) {
    (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(schema.ast));
    var idProperty = effect_1.SchemaAST.getPropertySignatures(schema.ast).find(function (prop) { return prop.name === 'id'; });
    if (idProperty != null) {
        throw new Error('"id" property name is reserved');
    }
};
exports.checkIdNotPresentOnSchema = checkIdNotPresentOnSchema;
