"use strict";
//
// Copyright 2025 DXOS.org
//
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.attachTypedJsonSerializer = exports.setRefResolverOnData = exports.objectFromJSON = exports.objectToJSON = void 0;
var effect_1 = require("effect");
var debug_1 = require("@dxos/debug");
var echo_protocol_1 = require("@dxos/echo-protocol");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
var ref_1 = require("../ref");
var define_hidden_property_1 = require("../../../../live-object/src/define-hidden-property");
var accessors_1 = require("./accessors");
var meta_1 = require("./meta");
var model_1 = require("./model");
var typename_1 = require("./typename");
/**
 * Converts object to it's JSON representation.
 */
var objectToJSON = function (obj) {
    var _a;
    var typename = (_a = (0, typename_1.getType)(obj)) === null || _a === void 0 ? void 0 : _a.toString();
    (0, invariant_1.invariant)(typename && typeof typename === 'string');
    return typedJsonSerializer.call(obj);
};
exports.objectToJSON = objectToJSON;
/**
 * Creates an object from it's json representation.
 * Performs schema validation.
 * References and schema will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 */
var objectFromJSON = function (jsonData_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([jsonData_1], args_1, true), void 0, function (jsonData, _a) {
        var type, schema, obj, isRelation, sourceDxn, targetDxn, source, target, meta;
        var _b, _c;
        var _d = _a === void 0 ? {} : _a, refResolver = _d.refResolver, dxn = _d.dxn;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    (0, util_1.assumeType)(jsonData);
                    (0, invariant_1.assertArgument)(typeof jsonData === 'object' && jsonData !== null, 'expect object');
                    (0, invariant_1.assertArgument)(typeof jsonData[model_1.ATTR_TYPE] === 'string', 'expected object to have a type');
                    (0, invariant_1.assertArgument)(typeof jsonData.id === 'string', 'expected object to have an id');
                    type = keys_1.DXN.parse(jsonData[model_1.ATTR_TYPE]);
                    return [4 /*yield*/, (refResolver === null || refResolver === void 0 ? void 0 : refResolver.resolveSchema(type))];
                case 1:
                    schema = _e.sent();
                    (0, invariant_1.invariant)(schema === undefined || effect_1.Schema.isSchema(schema));
                    if (!(schema != null)) return [3 /*break*/, 3];
                    return [4 /*yield*/, schema.pipe(effect_1.Schema.decodeUnknownPromise)(jsonData)];
                case 2:
                    obj = _e.sent();
                    if (refResolver) {
                        (0, exports.setRefResolverOnData)(obj, refResolver);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    obj = decodeGeneric(jsonData, { refResolver: refResolver });
                    _e.label = 4;
                case 4:
                    (0, invariant_1.invariant)(keys_1.ObjectId.isValid(obj.id), 'Invalid object id');
                    (0, typename_1.setTypename)(obj, type);
                    if (schema) {
                        (0, accessors_1.setSchema)(obj, schema);
                    }
                    isRelation = typeof jsonData[model_1.ATTR_RELATION_SOURCE] === 'string' || typeof jsonData[model_1.ATTR_RELATION_TARGET] === 'string';
                    if (!isRelation) return [3 /*break*/, 7];
                    sourceDxn = keys_1.DXN.parse((_b = jsonData[model_1.ATTR_RELATION_SOURCE]) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new TypeError('Missing relation source')));
                    targetDxn = keys_1.DXN.parse((_c = jsonData[model_1.ATTR_RELATION_TARGET]) !== null && _c !== void 0 ? _c : (0, debug_1.raise)(new TypeError('Missing relation target')));
                    return [4 /*yield*/, (refResolver === null || refResolver === void 0 ? void 0 : refResolver.resolve(sourceDxn))];
                case 5:
                    source = (_e.sent());
                    return [4 /*yield*/, (refResolver === null || refResolver === void 0 ? void 0 : refResolver.resolve(targetDxn))];
                case 6:
                    target = (_e.sent());
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.EntityKindId, ast_1.EntityKind.Relation);
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationSourceDXNId, sourceDxn);
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationTargetDXNId, targetDxn);
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationSourceId, source);
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationTargetId, target);
                    return [3 /*break*/, 8];
                case 7:
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.EntityKindId, ast_1.EntityKind.Object);
                    _e.label = 8;
                case 8:
                    if (!(typeof jsonData[model_1.ATTR_META] === 'object')) return [3 /*break*/, 10];
                    return [4 /*yield*/, meta_1.ObjectMetaSchema.pipe(effect_1.Schema.decodeUnknownPromise)(jsonData[model_1.ATTR_META])];
                case 9:
                    meta = _e.sent();
                    // Defensive programming.
                    (0, invariant_1.invariant)(Array.isArray(meta.keys));
                    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.MetaId, meta);
                    _e.label = 10;
                case 10:
                    if (dxn) {
                        (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.SelfDXNId, dxn);
                    }
                    (0, model_1.assertObjectModelShape)(obj);
                    (0, invariant_1.invariant)(obj[model_1.ATTR_TYPE] === undefined, 'Invalid object model');
                    (0, invariant_1.invariant)(obj[model_1.ATTR_SELF_DXN] === undefined, 'Invalid object model');
                    (0, invariant_1.invariant)(obj[model_1.ATTR_DELETED] === undefined, 'Invalid object model');
                    (0, invariant_1.invariant)(obj[model_1.ATTR_RELATION_SOURCE] === undefined, 'Invalid object model');
                    (0, invariant_1.invariant)(obj[model_1.ATTR_RELATION_TARGET] === undefined, 'Invalid object model');
                    (0, invariant_1.invariant)(obj[model_1.ATTR_META] === undefined, 'Invalid object model');
                    return [2 /*return*/, obj];
            }
        });
    });
};
exports.objectFromJSON = objectFromJSON;
var decodeGeneric = function (jsonData, options) {
    var _a = jsonData, _b = model_1.ATTR_TYPE, _type = _a[_b], _c = model_1.ATTR_META, _meta = _a[_c], _d = model_1.ATTR_DELETED, _deleted = _a[_d], _e = model_1.ATTR_RELATION_SOURCE, _relationSource = _a[_e], _f = model_1.ATTR_RELATION_TARGET, _relationTarget = _a[_f], _g = model_1.ATTR_SELF_DXN, _selfDxn = _a[_g], props = __rest(_a, [typeof _b === "symbol" ? _b : _b + "", typeof _c === "symbol" ? _c : _c + "", typeof _d === "symbol" ? _d : _d + "", typeof _e === "symbol" ? _e : _e + "", typeof _f === "symbol" ? _f : _f + "", typeof _g === "symbol" ? _g : _g + ""]);
    return (0, util_1.deepMapValues)(props, function (value, recurse) {
        if ((0, echo_protocol_1.isEncodedReference)(value)) {
            return (0, ref_1.refFromEncodedReference)(value, options.refResolver);
        }
        return recurse(value);
    });
};
var setRefResolverOnData = function (obj, refResolver) {
    var go = function (value) {
        if (ref_1.Ref.isRef(value)) {
            (0, ref_1.setRefResolver)(value, refResolver);
        }
        else {
            (0, util_1.visitValues)(value, go);
        }
    };
    go(obj);
};
exports.setRefResolverOnData = setRefResolverOnData;
var attachTypedJsonSerializer = function (obj) {
    var descriptor = Object.getOwnPropertyDescriptor(obj, 'toJSON');
    if (descriptor) {
        return;
    }
    Object.defineProperty(obj, 'toJSON', {
        value: typedJsonSerializer,
        writable: false,
        enumerable: false,
        // Setting `configurable` to false breaks proxy invariants, should be fixable.
        configurable: true,
    });
};
exports.attachTypedJsonSerializer = attachTypedJsonSerializer;
// NOTE: KEEP as function.
var typedJsonSerializer = function () {
    var _a = this, id = _a.id, rest = __rest(_a, ["id"]);
    var result = {
        id: id,
    };
    if (this[model_1.TypeId]) {
        result[model_1.ATTR_TYPE] = this[model_1.TypeId].toString();
    }
    if (this[model_1.SelfDXNId]) {
        result[model_1.ATTR_SELF_DXN] = this[model_1.SelfDXNId].toString();
    }
    if (this[model_1.RelationSourceDXNId]) {
        var sourceDXN = this[model_1.RelationSourceDXNId];
        (0, invariant_1.invariant)(sourceDXN instanceof keys_1.DXN);
        result[model_1.ATTR_RELATION_SOURCE] = sourceDXN.toString();
    }
    if (this[model_1.RelationTargetDXNId]) {
        var targetDXN = this[model_1.RelationTargetDXNId];
        (0, invariant_1.invariant)(targetDXN instanceof keys_1.DXN);
        result[model_1.ATTR_RELATION_TARGET] = targetDXN.toString();
    }
    if (this[model_1.MetaId]) {
        result[model_1.ATTR_META] = serializeMeta(this[model_1.MetaId]);
    }
    Object.assign(result, serializeData(rest));
    return result;
};
var serializeData = function (data) {
    return (0, util_1.deepMapValues)(data, function (value, recurse) {
        if (ref_1.Ref.isRef(value)) {
            // TODO(dmaretskyi): Should this be configurable?
            return value.noInline().encode();
        }
        return recurse(value);
    });
};
var serializeMeta = function (meta) {
    return (0, util_1.deepMapValues)(meta, function (value, recurse) { return recurse(value); });
};
