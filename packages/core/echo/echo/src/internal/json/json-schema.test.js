"use strict";
//
// Copyright 2022 DXOS.org
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
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var effect_2 = require("@dxos/effect");
var keys_1 = require("@dxos/keys");
var log_1 = require("@dxos/log");
var ast_1 = require("../ast");
var formats_1 = require("../formats");
var json_schema_1 = require("../json-schema");
var object_1 = require("../object");
var ref_1 = require("../ref");
var schema_1 = require("../schema");
var testing_1 = require("../testing");
var json_schema_2 = require("./json-schema");
var EXAMPLE_NAMESPACE = '@example';
(0, vitest_1.describe)('effect-to-json', function () {
    (0, vitest_1.test)('type annotation', function () {
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({
            typename: 'example.com/type/Test',
            version: '0.1.0',
        })({ name: effect_1.Schema.String })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        (0, vitest_1.expect)(jsonSchema.$id).toEqual('dxn:type:example.com/type/Test');
        (0, vitest_1.expect)(jsonSchema.version).toEqual('0.1.0');
    });
    (0, vitest_1.test)('property meta annotation', function () {
        var meta = { maxLength: 0 };
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({
            typename: 'example.com/type/Test',
            version: '0.1.0',
        })({
            name: effect_1.Schema.String.pipe((0, ast_1.PropertyMeta)(EXAMPLE_NAMESPACE, meta)),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        (0, vitest_1.expect)((0, json_schema_1.getNormalizedEchoAnnotations)(jsonSchema.properties.name).meta[EXAMPLE_NAMESPACE]).to.deep.eq(meta);
    });
    (0, vitest_1.test)('reference annotation', function () {
        var Nested = /** @class */ (function (_super) {
            __extends(Nested, _super);
            function Nested() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Nested;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
            name: effect_1.Schema.String,
        })));
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Test', version: '0.1.0' })({
            name: (0, ref_1.Ref)(Nested),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        // log.info('schema', { jsonSchema });
        var nested = jsonSchema.properties.name;
        expectReferenceAnnotation(nested);
    });
    // TODO(ZaymonFC): @dmaretskyi we still need to fix this.
    // TODO(dmaretskyi): Remove FieldLookupAnnotationId.
    vitest_1.test.skip('reference annotation with lookup property', function () {
        var _a;
        var Nested = /** @class */ (function (_super) {
            __extends(Nested, _super);
            function Nested() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Nested;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
            name: effect_1.Schema.String,
        })));
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Test', version: '0.1.0' })({
            name: (0, ref_1.Ref)(Nested).annotations((_a = {}, _a[ast_1.FieldLookupAnnotationId] = 'name', _a)),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        var effectSchema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        var annotation = (0, effect_2.findAnnotation)(effectSchema.ast, ast_1.FieldLookupAnnotationId);
        (0, vitest_1.expect)(annotation).to.not.toBeUndefined();
    });
    (0, vitest_1.test)('array of references', function () {
        var Nested = /** @class */ (function (_super) {
            __extends(Nested, _super);
            function Nested() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Nested;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
            name: effect_1.Schema.String,
        })));
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Test', version: '0.1.0' })({
            name: effect_1.Schema.Array((0, ref_1.Ref)(Nested)),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        expectReferenceAnnotation(jsonSchema.properties.name.items);
    });
    (0, vitest_1.test)('optional references', function () {
        var Nested = /** @class */ (function (_super) {
            __extends(Nested, _super);
            function Nested() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Nested;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/TestNested', version: '0.1.0' })({
            name: effect_1.Schema.String,
        })));
        var Test = /** @class */ (function (_super) {
            __extends(Test, _super);
            function Test() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Test;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Test', version: '0.1.0' })({
            name: effect_1.Schema.optional((0, ref_1.Ref)(Nested)),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
        expectReferenceAnnotation(jsonSchema.properties.name);
    });
    (0, vitest_1.test)('regular objects are not annotated', function () {
        var object = effect_1.Schema.Struct({ name: effect_1.Schema.Struct({ name: effect_1.Schema.String }) });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(object);
        (0, vitest_1.expect)((0, json_schema_1.getNormalizedEchoAnnotations)(jsonSchema)).to.be.undefined;
        (0, vitest_1.expect)((0, json_schema_1.getNormalizedEchoAnnotations)(jsonSchema.properties.name)).to.be.undefined;
    });
    (0, vitest_1.test)('annotations', function () {
        var TestSchema = /** @class */ (function (_super) {
            __extends(TestSchema, _super);
            function TestSchema() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return TestSchema;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Contact', version: '0.1.0' })({
            name: effect_1.Schema.String.annotations({ description: 'Person name', title: 'Name' }),
            email: effect_1.Schema.String.pipe(formats_1.FormatAnnotation.set(formats_1.FormatEnum.Email)).annotations({
                description: 'Email address',
            }),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(TestSchema);
        (0, vitest_1.expect)(jsonSchema).to.deep.eq({
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'dxn:type:example.com/type/Contact',
            entityKind: ast_1.EntityKind.Object,
            typename: 'example.com/type/Contact',
            version: '0.1.0',
            type: 'object',
            required: ['name', 'email', 'id'],
            properties: {
                id: { type: 'string' },
                name: { type: 'string', title: 'Name', description: 'Person name' },
                email: {
                    type: 'string',
                    description: 'Email address',
                    format: 'email',
                },
            },
            propertyOrder: ['name', 'email', 'id'],
            additionalProperties: false,
        });
    });
    (0, vitest_1.test)('handles suspend -- Contact schema serialization', function () {
        var schema = (0, json_schema_2.toJsonSchema)(testing_1.Testing.Contact);
        (0, vitest_1.expect)(Object.keys(schema.properties)).toEqual(['id', 'name', 'username', 'email', 'tasks', 'address']);
    });
    (0, vitest_1.test)('reference property by ref', function () {
        var Organization = /** @class */ (function (_super) {
            __extends(Organization, _super);
            function Organization() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Organization;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Organization', version: '0.1.0' })({
            field: effect_1.Schema.String,
        })));
        var Contact = /** @class */ (function (_super) {
            __extends(Contact, _super);
            function Contact() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Contact;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Contact', version: '0.1.0' })({
            name: effect_1.Schema.String,
            organization: (0, ref_1.Ref)(Organization).annotations({ description: 'Contact organization' }),
        })));
        // log.info('Contact', { ast: Contact.ast });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Contact);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'dxn:type:example.com/type/Contact',
            entityKind: ast_1.EntityKind.Object,
            typename: 'example.com/type/Contact',
            version: '0.1.0',
            type: 'object',
            additionalProperties: false,
            properties: {
                id: {
                    type: 'string',
                },
                name: {
                    type: 'string',
                },
                organization: {
                    $id: '/schemas/echo/ref',
                    description: 'Contact organization',
                    reference: {
                        schema: {
                            $ref: 'dxn:type:example.com/type/Organization',
                        },
                        schemaVersion: '0.1.0',
                    },
                },
            },
            required: ['name', 'organization', 'id'],
            propertyOrder: ['name', 'organization', 'id'],
        });
    });
    (0, vitest_1.test)('add reference property', function () {
        var _a, _b;
        var Organization = /** @class */ (function (_super) {
            __extends(Organization, _super);
            function Organization() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Organization;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Organization', version: '0.1.0' })({
            field: effect_1.Schema.String,
        })));
        var Contact = /** @class */ (function (_super) {
            __extends(Contact, _super);
            function Contact() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Contact;
        }((0, object_1.TypedObject)({ typename: 'example.com/type/Contact', version: '0.1.0' })({
            name: effect_1.Schema.String,
            organization: (0, ref_1.Ref)(Organization).annotations({ description: 'Contact organization' }),
        })));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Contact);
        (0, json_schema_1.setSchemaProperty)(jsonSchema, 'organization', (0, ref_1.createSchemaReference)(Organization.typename));
        var typename = ((_b = (0, ref_1.getSchemaReference)((_a = (0, json_schema_1.getSchemaProperty)(jsonSchema, 'organization')) !== null && _a !== void 0 ? _a : {})) !== null && _b !== void 0 ? _b : {}).typename;
        (0, vitest_1.expect)(typename).to.eq(Organization.typename);
    });
    (0, vitest_1.test)('serialize circular schema (StoredSchema)', function () {
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema_1.StoredSchema);
        (0, vitest_1.expect)(Object.keys(jsonSchema.properties).length).toBeGreaterThan(0);
        // TODO(dmaretskyi): Currently unable to deserialize.
        // const effectSchema = toEffectSchema(jsonSchema);
        (0, log_1.log)('schema', { jsonSchema: jsonSchema });
    });
    (0, vitest_1.test)('tuple schema with description', function () {
        var schema = effect_1.Schema.Struct({
            args: effect_1.Schema.Tuple(effect_1.Schema.String.annotations({ description: 'The source currency' }), effect_1.Schema.String.annotations({ description: 'The target currency' })),
        });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, log_1.log)('schema', { jsonSchema: jsonSchema });
        effect_1.Schema.asserts(json_schema_1.JsonSchemaType)(jsonSchema);
    });
    (0, vitest_1.test)('reference with title annotation', function () {
        var schema = effect_1.Schema.Struct({
            contact: (0, ref_1.Ref)(testing_1.Testing.Contact).annotations({ title: 'Custom Title' }),
        });
        // log.info('schema before', { ast: schema.ast });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        // log.info('json schema', { jsonSchema });
        var effectSchema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        // log.info('effect schema', { ast: effectSchema.ast });
        (0, vitest_1.expect)(effectSchema.pipe(effect_1.Schema.pluck('contact'), effect_1.Schema.typeSchema, function (s) { return s.ast; }, effect_1.SchemaAST.getAnnotation(effect_1.SchemaAST.TitleAnnotationId), effect_1.Option.getOrUndefined)).to.eq('Custom Title');
    });
    (0, vitest_1.test)('relation schema', function () {
        var schema = testing_1.Testing.HasManager;
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $id: 'dxn:type:example.com/type/HasManager',
            $schema: 'http://json-schema.org/draft-07/schema#',
            entityKind: 'relation',
            typename: 'example.com/type/HasManager',
            version: '0.1.0',
            relationSource: {
                // TODO(dmaretskyi): Should those point to specific schema version?
                $ref: 'dxn:type:example.com/type/Contact',
            },
            relationTarget: {
                // TODO(dmaretskyi): Should those point to specific schema version?
                $ref: 'dxn:type:example.com/type/Contact',
            },
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                },
                since: {
                    type: 'string',
                },
            },
            propertyOrder: ['since', 'id'],
            required: ['id'],
            additionalProperties: false,
        });
    });
    (0, vitest_1.test)('label prop', function () {
        var Organization = effect_1.Schema.Struct({
            id: keys_1.ObjectId,
            name: effect_1.Schema.String,
        }).pipe((0, object_1.EchoObject)({
            typename: 'example.com/type/Organization',
            version: '0.1.0',
        }), ast_1.LabelAnnotation.set(['name']));
        var jsonSchema = (0, json_schema_2.toJsonSchema)(Organization);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $id: 'dxn:type:example.com/type/Organization',
            $schema: 'http://json-schema.org/draft-07/schema#',
            typename: 'example.com/type/Organization',
            version: '0.1.0',
            entityKind: 'object',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    pattern: '^[0-7][0-9A-HJKMNP-TV-Z]{25}$',
                    description: 'A Universally Unique Lexicographically Sortable Identifier',
                },
                name: {
                    type: 'string',
                },
            },
            annotations: {
                labelProp: ['name'],
            },
            propertyOrder: ['id', 'name'],
            required: ['id', 'name'],
            additionalProperties: false,
        });
    });
    (0, vitest_1.test)('object id with description', function () {
        var schema = effect_1.Schema.Struct({
            id: keys_1.ObjectId.annotations({ description: 'The id' }),
        });
        // log.info('schema', { schema: ObjectId.ast });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toMatchInlineSnapshot("\n      {\n        \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n        \"additionalProperties\": false,\n        \"properties\": {\n          \"id\": {\n            \"description\": \"The id\",\n            \"pattern\": \"^[0-7][0-9A-HJKMNP-TV-Z]{25}$\",\n            \"type\": \"string\",\n          },\n        },\n        \"propertyOrder\": [\n          \"id\",\n        ],\n        \"required\": [\n          \"id\",\n        ],\n        \"type\": \"object\",\n      }\n    ");
    });
    (0, vitest_1.test)('email schema', function () {
        var schema = formats_1.Email;
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toMatchInlineSnapshot("\n      {\n        \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n        \"description\": \"Email address\",\n        \"format\": \"email\",\n        \"pattern\": \"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\",\n        \"title\": \"Email\",\n        \"type\": \"string\",\n      }\n    ");
        var effectSchema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        (0, vitest_1.expect)((0, testing_1.prepareAstForCompare)(effectSchema.ast)).to.deep.eq((0, testing_1.prepareAstForCompare)(schema.ast));
    });
    var expectReferenceAnnotation = function (object) {
        (0, vitest_1.expect)(object.reference).to.deep.eq({
            schema: {
                $ref: 'dxn:type:example.com/type/TestNested',
            },
            schemaVersion: '0.1.0',
        });
    };
});
(0, vitest_1.describe)('json-to-effect', function () {
    (0, vitest_1.describe)('field schema', function () {
        (0, vitest_1.test)('email', function () {
            var schema = formats_1.Email;
            (0, vitest_1.expect)((0, json_schema_2.toJsonSchema)(schema)).to.deep.eq({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'string',
                format: 'email',
                title: 'Email',
                description: 'Email address',
                // TODO(dmaretskyi): omit pattern.
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            });
        });
    });
    var _loop_1 = function (partial) {
        (0, vitest_1.test)("deserialized equals original ".concat(partial ? 'with partial' : ''), function () {
            var Organization = /** @class */ (function (_super) {
                __extends(Organization, _super);
                function Organization() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return Organization;
            }((0, object_1.TypedObject)({ typename: 'example.com/type/Organization', version: '0.1.0' })({
                field: effect_1.Schema.String,
            })));
            var Test = /** @class */ (function (_super) {
                __extends(Test, _super);
                function Test() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return Test;
            }((0, object_1.TypedObject)({ typename: 'example.com/type/Test', version: '0.1.0' })({
                string: effect_1.Schema.String,
                number: effect_1.Schema.Number.pipe((0, ast_1.PropertyMeta)(EXAMPLE_NAMESPACE, { is_date: true })),
                boolean: effect_1.Schema.Boolean,
                array: effect_1.Schema.Array(effect_1.Schema.String),
                twoDArray: effect_1.Schema.Array(effect_1.Schema.Array(effect_1.Schema.String)),
                record: effect_1.Schema.Record({ key: effect_1.Schema.String, value: effect_1.Schema.Number }),
                object: effect_1.Schema.Struct({ id: effect_1.Schema.String, field: (0, ref_1.Ref)(Organization) }),
                echoObject: (0, ref_1.Ref)(Organization),
                echoObjectArray: effect_1.Schema.Array((0, ref_1.Ref)(Organization)),
                email: effect_1.Schema.String.pipe(formats_1.FormatAnnotation.set(formats_1.FormatEnum.Email)),
                null: effect_1.Schema.Null,
            }, partial ? { partial: partial } : {})));
            var jsonSchema = (0, json_schema_2.toJsonSchema)(Test);
            // log.info('schema', { jsonSchema });
            var schema = (0, json_schema_2.toEffectSchema)(jsonSchema);
            (0, vitest_1.expect)(function () { return (0, vitest_1.expect)(schema.ast).to.deep.eq(Test.ast); }).to.throw();
            (0, vitest_1.expect)(function () { return (0, vitest_1.expect)((0, testing_1.prepareAstForCompare)(Test.ast)).to.deep.eq(Test.ast); }).to.throw();
            (0, vitest_1.expect)(function () { return (0, vitest_1.expect)(schema.ast).to.deep.eq((0, testing_1.prepareAstForCompare)(Test.ast)); }).to.throw();
            // log.info('', { original: prepareAstForCompare(Schema.ast), deserialized: prepareAstForCompare(schema.ast) });
            (0, vitest_1.expect)((0, testing_1.prepareAstForCompare)(schema.ast)).to.deep.eq((0, testing_1.prepareAstForCompare)(Test.ast));
            // TODO(dmaretskyi): Fix.
            // expect(
            //   SchemaAST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'email')!.type.annotations[
            //     FormatAnnotationId
            //   ],
            // ).toEqual('email');
        });
    };
    for (var _i = 0, _a = [false, true]; _i < _a.length; _i++) {
        var partial = _a[_i];
        _loop_1(partial);
    }
    (0, vitest_1.test)('legacy schema with dxn:type $id gets decoded', function () {
        var jsonSchema = {
            $id: 'dxn:type:example.com/type/Project',
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            echo: {
                type: {
                    schemaId: '01JERV1HQCQZDQ4NVCJ42QB38F',
                    typename: 'example.com/type/Project',
                    version: '0.1.0',
                },
            },
            properties: {
                description: {
                    type: 'string',
                },
                id: {
                    type: 'string',
                },
                name: {
                    echo: {
                        generator: 'commerce.productName',
                    },
                    type: 'string',
                },
            },
            required: ['id'],
            type: 'object',
            version: '0.1.0',
        };
        var schema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        (0, vitest_1.expect)((0, ast_1.getTypeAnnotation)(schema)).to.deep.eq({
            kind: ast_1.EntityKind.Object,
            typename: 'example.com/type/Project',
            version: '0.1.0',
        });
        (0, vitest_1.expect)((0, ast_1.getTypeIdentifierAnnotation)(schema)).to.deep.eq('dxn:echo:@:01JERV1HQCQZDQ4NVCJ42QB38F');
    });
    (0, vitest_1.test)('symbol annotations get compared', function () {
        var schema1 = effect_1.Schema.String.pipe(formats_1.FormatAnnotation.set(formats_1.FormatEnum.Email));
        var schema2 = effect_1.Schema.String.pipe(formats_1.FormatAnnotation.set(formats_1.FormatEnum.Currency));
        (0, vitest_1.expect)((0, testing_1.prepareAstForCompare)(schema1.ast)).not.to.deep.eq((0, testing_1.prepareAstForCompare)(schema2.ast));
    });
    (0, vitest_1.test)('description gets preserved', function () {
        var schema = effect_1.Schema.Struct({
            name: effect_1.Schema.String.annotations({ description: 'Name' }),
        });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        var effectSchema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        var jsonSchema2 = (0, json_schema_2.toJsonSchema)(effectSchema);
        (0, vitest_1.expect)(jsonSchema2.properties.name.description).to.eq('Name');
    });
    (0, vitest_1.test)('relation schema roundtrip', function () {
        var schema = testing_1.Testing.HasManager;
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        var effectSchema = (0, json_schema_2.toEffectSchema)(jsonSchema);
        (0, vitest_1.expect)((0, testing_1.prepareAstForCompare)(effectSchema.ast)).to.deep.eq((0, testing_1.prepareAstForCompare)(schema.ast));
    });
    (0, vitest_1.test)('generator annotation', function () {
        var schema = effect_1.Schema.Struct({
            name: effect_1.Schema.String.pipe(ast_1.GeneratorAnnotation.set('commerce.productName')),
        });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toMatchInlineSnapshot("\n      {\n        \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n        \"additionalProperties\": false,\n        \"properties\": {\n          \"name\": {\n            \"annotations\": {\n              \"generator\": \"commerce.productName\",\n            },\n            \"type\": \"string\",\n          },\n        },\n        \"propertyOrder\": [\n          \"name\",\n        ],\n        \"required\": [\n          \"name\",\n        ],\n        \"type\": \"object\",\n      }\n    ");
    });
    // test('generator annotation on object', () => {
    //   const schema = Schema.Struct({
    //   });
    //   const jsonSchema = toJsonSchema(schema);
    //   expect(jsonSchema).toMatchInlineSnapshot();
    // });
    (0, vitest_1.test)('default annotation ', function () {
        var schema = effect_1.Schema.Struct({
            str: effect_1.Schema.String.annotations({
                default: 'foo',
            }),
            arr: effect_1.Schema.Array(effect_1.Schema.String).annotations({
                default: [],
            }),
            obj: effect_1.Schema.Struct({
                foo: effect_1.Schema.optional(effect_1.Schema.String).annotations({
                    default: 'bar',
                }),
            }),
        });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toMatchInlineSnapshot("\n      {\n        \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n        \"additionalProperties\": false,\n        \"properties\": {\n          \"arr\": {\n            \"default\": [],\n            \"items\": {\n              \"type\": \"string\",\n            },\n            \"type\": \"array\",\n          },\n          \"obj\": {\n            \"additionalProperties\": false,\n            \"properties\": {\n              \"foo\": {\n                \"default\": \"bar\",\n                \"type\": \"string\",\n              },\n            },\n            \"propertyOrder\": [\n              \"foo\",\n            ],\n            \"required\": [],\n            \"type\": \"object\",\n          },\n          \"str\": {\n            \"default\": \"foo\",\n            \"type\": \"string\",\n          },\n        },\n        \"propertyOrder\": [\n          \"str\",\n          \"arr\",\n          \"obj\",\n        ],\n        \"required\": [\n          \"str\",\n          \"arr\",\n          \"obj\",\n        ],\n        \"type\": \"object\",\n      }\n    ");
    });
});
(0, vitest_1.describe)('reference', function () {
    (0, vitest_1.test)('reference annotation', function () {
        var schema = (0, ref_1.Ref)(testing_1.Testing.Contact);
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $id: '/schemas/echo/ref',
            $schema: 'http://json-schema.org/draft-07/schema#',
            reference: {
                schema: {
                    $ref: 'dxn:type:example.com/type/Contact',
                },
                schemaVersion: '0.1.0',
            },
        });
    });
    (0, vitest_1.test)('title annotation', function () {
        var schema = (0, ref_1.Ref)(testing_1.Testing.Contact).annotations({ title: 'My custom title' });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $id: '/schemas/echo/ref',
            $schema: 'http://json-schema.org/draft-07/schema#',
            reference: {
                schema: {
                    $ref: 'dxn:type:example.com/type/Contact',
                },
                schemaVersion: '0.1.0',
            },
            title: 'My custom title',
        });
    });
    (0, vitest_1.test)('description annotation', function () {
        var schema = (0, ref_1.Ref)(testing_1.Testing.Contact).annotations({ description: 'My custom description' });
        var jsonSchema = (0, json_schema_2.toJsonSchema)(schema);
        (0, vitest_1.expect)(jsonSchema).toEqual({
            $id: '/schemas/echo/ref',
            $schema: 'http://json-schema.org/draft-07/schema#',
            reference: {
                schema: {
                    $ref: 'dxn:type:example.com/type/Contact',
                },
                schemaVersion: '0.1.0',
            },
            description: 'My custom description',
        });
    });
});
