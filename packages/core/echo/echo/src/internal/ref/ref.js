"use strict";
//
// Copyright 2024 DXOS.org
//
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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _RefImpl_dxn, _RefImpl_resolver, _RefImpl_signal, _RefImpl_target, _RefImpl_resolverCallback, _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticRefResolver = exports.refFromEncodedReference = exports.getRefSavedTarget = exports.setRefResolver = exports.RefImpl = exports.createEchoReferenceSchema = exports.Ref = exports.RefTypeId = exports.createSchemaReference = exports.getSchemaReference = exports.JSON_SCHEMA_ECHO_REF_ID = void 0;
var effect_1 = require("effect");
var echo_protocol_1 = require("@dxos/echo-protocol");
var runtime_1 = require("@dxos/echo-signals/runtime");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
/**
 * The `$id` field for an ECHO reference schema.
 */
exports.JSON_SCHEMA_ECHO_REF_ID = '/schemas/echo/ref';
// TODO(burdon): Define return type.
var getSchemaReference = function (property) {
    var $id = property.$id, _b = property.reference, _c = _b === void 0 ? {} : _b, _d = _c.schema, _e = _d === void 0 ? {} : _d, $ref = _e.$ref;
    if ($id === exports.JSON_SCHEMA_ECHO_REF_ID && $ref) {
        return { typename: keys_1.DXN.parse($ref).typename };
    }
};
exports.getSchemaReference = getSchemaReference;
var createSchemaReference = function (typename) {
    return {
        $id: exports.JSON_SCHEMA_ECHO_REF_ID,
        reference: {
            schema: {
                $ref: keys_1.DXN.fromTypename(typename).toString(),
            },
        },
    };
};
exports.createSchemaReference = createSchemaReference;
exports.RefTypeId = Symbol('@dxos/echo-schema/Ref');
/**
 * Schema builder for references.
 */
var Ref = function (schema) {
    (0, invariant_1.assertArgument)(effect_1.Schema.isSchema(schema), 'Must call with an instance of effect-schema');
    var annotation = (0, ast_1.getTypeAnnotation)(schema);
    if (annotation == null) {
        throw new Error('Reference target must be an ECHO schema.');
    }
    return (0, exports.createEchoReferenceSchema)((0, ast_1.getTypeIdentifierAnnotation)(schema), annotation.typename, annotation.version, getSchemaExpectedName(schema.ast));
};
exports.Ref = Ref;
exports.Ref.isRef = function (obj) {
    return obj && typeof obj === 'object' && exports.RefTypeId in obj;
};
exports.Ref.hasObjectId = function (id) { return function (ref) { return ref.dxn.isLocalObjectId() && ref.dxn.parts[1] === id; }; };
exports.Ref.isRefSchema = function (schema) {
    return exports.Ref.isRefSchemaAST(schema.ast);
};
exports.Ref.isRefSchemaAST = function (ast) {
    return effect_1.SchemaAST.getAnnotation(ast, ast_1.ReferenceAnnotationId).pipe(effect_1.Option.isSome);
};
exports.Ref.make = function (obj) {
    if (typeof obj !== 'object' || obj === null) {
        throw new TypeError('Expected: ECHO object.');
    }
    // TODO(dmaretskyi): Extract to `getObjectDXN` function.
    var id = obj.id;
    (0, invariant_1.invariant)(keys_1.ObjectId.isValid(id), 'Invalid object ID');
    var dxn = echo_protocol_1.Reference.localObjectReference(id).toDXN();
    return new RefImpl(dxn, obj);
};
exports.Ref.fromDXN = function (dxn) {
    return new RefImpl(dxn);
};
/**
 * @internal
 */
// TODO(burdon): Move to json schema and make private?
var createEchoReferenceSchema = function (echoId, typename, version, schemaName) {
    var _b;
    if (!echoId && !typename) {
        throw new TypeError('Either echoId or typename must be provided.');
    }
    var referenceInfo = {
        schema: {
            // TODO(dmaretskyi): Include version?
            $ref: echoId !== null && echoId !== void 0 ? echoId : keys_1.DXN.fromTypename(typename).toString(),
        },
        schemaVersion: version,
    };
    // TODO(dmaretskyi): Add name and description.
    var refSchema = effect_1.Schema.declare([], {
        encode: function () {
            return function (value) {
                return effect_1.Effect.succeed({
                    '/': value.dxn.toString(),
                });
            };
        },
        decode: function () {
            return function (value) {
                // TODO(dmaretskyi): This branch seems to be taken by Schema.is
                if (exports.Ref.isRef(value)) {
                    return effect_1.Effect.succeed(value);
                }
                if (typeof value !== 'object' || value == null || typeof value['/'] !== 'string') {
                    return effect_1.Effect.fail(new effect_1.ParseResult.Unexpected(value, 'reference'));
                }
                return effect_1.Effect.succeed(exports.Ref.fromDXN(keys_1.DXN.parse(value['/'])));
            };
        },
    }, (_b = {
            jsonSchema: {
                $id: exports.JSON_SCHEMA_ECHO_REF_ID,
                reference: referenceInfo,
            }
        },
        _b[ast_1.ReferenceAnnotationId] = {
            typename: typename !== null && typename !== void 0 ? typename : '',
            version: version,
        },
        _b));
    return refSchema;
};
exports.createEchoReferenceSchema = createEchoReferenceSchema;
var getSchemaExpectedName = function (ast) {
    return effect_1.SchemaAST.getIdentifierAnnotation(ast).pipe(effect_1.Option.orElse(function () { return effect_1.SchemaAST.getTitleAnnotation(ast); }), effect_1.Option.orElse(function () { return effect_1.SchemaAST.getDescriptionAnnotation(ast); }), effect_1.Option.getOrElse(function () { return undefined; }));
};
var RefImpl = /** @class */ (function () {
    function RefImpl(dxn, target) {
        var _this = this;
        _RefImpl_dxn.set(this, void 0);
        _RefImpl_resolver.set(this, undefined);
        _RefImpl_signal.set(this, runtime_1.compositeRuntime.createSignal());
        /**
         * Target is set when the reference is created from a specific object.
         * In this case, the target might not be in the database.
         */
        _RefImpl_target.set(this, undefined);
        /**
         * Callback to issue a reactive notification when object is resolved.
         */
        _RefImpl_resolverCallback.set(this, function () {
            __classPrivateFieldGet(_this, _RefImpl_signal, "f").notifyWrite();
        });
        this[_a] = refVariance;
        __classPrivateFieldSet(this, _RefImpl_dxn, dxn, "f");
        __classPrivateFieldSet(this, _RefImpl_target, target, "f");
    }
    Object.defineProperty(RefImpl.prototype, "dxn", {
        /**
         * @inheritdoc
         */
        get: function () {
            return __classPrivateFieldGet(this, _RefImpl_dxn, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RefImpl.prototype, "target", {
        /**
         * @inheritdoc
         */
        get: function () {
            __classPrivateFieldGet(this, _RefImpl_signal, "f").notifyRead();
            if (__classPrivateFieldGet(this, _RefImpl_target, "f")) {
                return __classPrivateFieldGet(this, _RefImpl_target, "f");
            }
            (0, invariant_1.invariant)(__classPrivateFieldGet(this, _RefImpl_resolver, "f"), 'Resolver is not set');
            return __classPrivateFieldGet(this, _RefImpl_resolver, "f").resolveSync(__classPrivateFieldGet(this, _RefImpl_dxn, "f"), true, __classPrivateFieldGet(this, _RefImpl_resolverCallback, "f"));
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @inheritdoc
     */
    RefImpl.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var obj;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (__classPrivateFieldGet(this, _RefImpl_target, "f")) {
                            return [2 /*return*/, __classPrivateFieldGet(this, _RefImpl_target, "f")];
                        }
                        (0, invariant_1.invariant)(__classPrivateFieldGet(this, _RefImpl_resolver, "f"), 'Resolver is not set');
                        return [4 /*yield*/, __classPrivateFieldGet(this, _RefImpl_resolver, "f").resolve(__classPrivateFieldGet(this, _RefImpl_dxn, "f"))];
                    case 1:
                        obj = _b.sent();
                        if (obj == null) {
                            throw new Error('Object not found');
                        }
                        return [2 /*return*/, obj];
                }
            });
        });
    };
    /**
     * @inheritdoc
     */
    RefImpl.prototype.tryLoad = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        (0, invariant_1.invariant)(__classPrivateFieldGet(this, _RefImpl_resolver, "f"), 'Resolver is not set');
                        return [4 /*yield*/, __classPrivateFieldGet(this, _RefImpl_resolver, "f").resolve(__classPrivateFieldGet(this, _RefImpl_dxn, "f"))];
                    case 1: return [2 /*return*/, (_b.sent())];
                }
            });
        });
    };
    /**
     * Do not inline the target object in the reference.
     * Makes .target unavailable unless the reference is connected to a database context.
     * Clones the reference object.
     */
    RefImpl.prototype.noInline = function () {
        var ref = new RefImpl(__classPrivateFieldGet(this, _RefImpl_dxn, "f"), undefined);
        __classPrivateFieldSet(ref, _RefImpl_resolver, __classPrivateFieldGet(this, _RefImpl_resolver, "f"), "f");
        return ref;
    };
    RefImpl.prototype.encode = function () {
        return __assign({ '/': __classPrivateFieldGet(this, _RefImpl_dxn, "f").toString() }, (__classPrivateFieldGet(this, _RefImpl_target, "f") ? { target: __classPrivateFieldGet(this, _RefImpl_target, "f") } : {}));
    };
    /**
     * Serializes the reference to a JSON object.
     * The serialization format is compatible with the IPLD-style encoded references.
     * When a reference has a saved target (i.e. the target or object holding the reference is not in the database),
     * the target is included in the serialized object.
     */
    RefImpl.prototype.toJSON = function () {
        return this.encode();
    };
    RefImpl.prototype.toString = function () {
        if (__classPrivateFieldGet(this, _RefImpl_target, "f")) {
            return "Ref(".concat(__classPrivateFieldGet(this, _RefImpl_target, "f").toString(), ")");
        }
        return "Ref(".concat(__classPrivateFieldGet(this, _RefImpl_dxn, "f").toString(), ")");
    };
    /**
     * Internal method to set the resolver.
     * @internal
     */
    RefImpl.prototype._setResolver = function (resolver) {
        __classPrivateFieldSet(this, _RefImpl_resolver, resolver, "f");
    };
    /**
     * Internal method to get the saved target.
     * Not the same as `target` which is resolved from the resolver.
     * @internal
     */
    RefImpl.prototype._getSavedTarget = function () {
        return __classPrivateFieldGet(this, _RefImpl_target, "f");
    };
    return RefImpl;
}());
exports.RefImpl = RefImpl;
_RefImpl_dxn = new WeakMap(), _RefImpl_resolver = new WeakMap(), _RefImpl_signal = new WeakMap(), _RefImpl_target = new WeakMap(), _RefImpl_resolverCallback = new WeakMap(), _a = exports.RefTypeId;
/**
 * Internal API for setting the reference resolver.
 */
var setRefResolver = function (ref, resolver) {
    (0, invariant_1.invariant)(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
    ref._setResolver(resolver);
};
exports.setRefResolver = setRefResolver;
/**
 * Internal API for getting the saved target on a reference.
 */
var getRefSavedTarget = function (ref) {
    (0, invariant_1.invariant)(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
    return ref._getSavedTarget();
};
exports.getRefSavedTarget = getRefSavedTarget;
// Used to validate reference target type.
var refVariance = {
    _T: null,
};
var refFromEncodedReference = function (encodedReference, resolver) {
    var dxn = keys_1.DXN.parse(encodedReference['/']);
    var ref = new RefImpl(dxn);
    // TODO(dmaretskyi): Handle inline target in the encoded reference.
    if (resolver) {
        (0, exports.setRefResolver)(ref, resolver);
    }
    return ref;
};
exports.refFromEncodedReference = refFromEncodedReference;
var StaticRefResolver = /** @class */ (function () {
    function StaticRefResolver() {
        this.objects = new Map();
        this.schemas = new Map();
    }
    StaticRefResolver.prototype.addObject = function (obj) {
        this.objects.set(obj.id, obj);
        return this;
    };
    StaticRefResolver.prototype.addSchema = function (schema) {
        var dxn = (0, ast_1.getSchemaDXN)(schema);
        (0, invariant_1.invariant)(dxn, 'Schema has no DXN');
        this.schemas.set(dxn.toString(), schema);
        return this;
    };
    StaticRefResolver.prototype.resolveSync = function (dxn, _load, _onLoad) {
        var _b;
        var id = (_b = dxn === null || dxn === void 0 ? void 0 : dxn.asEchoDXN()) === null || _b === void 0 ? void 0 : _b.echoId;
        if (id == null) {
            return undefined;
        }
        return this.objects.get(id);
    };
    StaticRefResolver.prototype.resolve = function (dxn) {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            var _b;
            return __generator(this, function (_c) {
                id = (_b = dxn === null || dxn === void 0 ? void 0 : dxn.asEchoDXN()) === null || _b === void 0 ? void 0 : _b.echoId;
                if (id == null) {
                    return [2 /*return*/, undefined];
                }
                return [2 /*return*/, this.objects.get(id)];
            });
        });
    };
    StaticRefResolver.prototype.resolveSchema = function (dxn) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, this.schemas.get(dxn.toString())];
            });
        });
    };
    return StaticRefResolver;
}());
exports.StaticRefResolver = StaticRefResolver;
