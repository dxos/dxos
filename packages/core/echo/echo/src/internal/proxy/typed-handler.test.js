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
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var internal_1 = require("@dxos/echo/internal");
var testing_1 = require("@dxos/echo-schema/testing");
var object_1 = require("./object");
(0, vitest_1.describe)('complex schema validations', function () {
    var setValue = function (target, prop, value) {
        target[prop] = value;
    };
    (0, vitest_1.test)('any', function () {
        var schema = effect_1.Schema.Struct({ field: effect_1.Schema.Any });
        var object = (0, object_1.live)(schema, { field: { nested: { value: 100 } } });
        (0, vitest_1.expect)(function () { return setValue(object, 'field', { any: 'value' }); }).not.to.throw();
    });
    (0, vitest_1.test)('meta', function () {
        var source = 'test';
        var schema = effect_1.Schema.Struct({ field: effect_1.Schema.Number });
        var object = (0, object_1.live)(schema, { field: 42 }, { keys: [(0, internal_1.foreignKey)(source, '123')] });
        (0, vitest_1.expect)((0, internal_1.getMeta)(object).keys).to.deep.eq([(0, internal_1.foreignKey)(source, '123')]);
    });
    (0, vitest_1.test)('object', function () {
        var schema = effect_1.Schema.Struct({ field: effect_1.Schema.optional(effect_1.Schema.Object) });
        var object = (0, object_1.live)(schema, { field: { nested: { value: 100 } } });
        (0, vitest_1.expect)(function () { return setValue(object, 'field', { any: 'value' }); }).not.to.throw();
    });
    (0, vitest_1.test)('references', function () {
        var _a;
        var Foo = /** @class */ (function (_super) {
            __extends(Foo, _super);
            function Foo() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Foo;
        }((0, internal_1.TypedObject)({ typename: 'example.com/type/Foo', version: '0.1.0' })({ field: effect_1.Schema.String })));
        var Bar = /** @class */ (function (_super) {
            __extends(Bar, _super);
            function Bar() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return Bar;
        }((0, internal_1.TypedObject)({ typename: 'example.com/type/Bar', version: '0.1.0' })({ fooRef: (0, internal_1.Ref)(Foo) })));
        var field = 'hello';
        (0, vitest_1.expect)(function () { return (0, object_1.live)(Bar, { fooRef: { id: '1', field: field } }); }).to.throw();
        (0, vitest_1.expect)(function () { return (0, object_1.live)(Bar, { fooRef: undefined }); }).to.throw(); // Unresolved reference.
        var bar = (0, object_1.live)(Bar, { fooRef: internal_1.Ref.make((0, object_1.live)(Foo, { field: field })) });
        (0, vitest_1.expect)((_a = bar.fooRef.target) === null || _a === void 0 ? void 0 : _a.field).to.eq(field);
    });
    (0, vitest_1.test)('index signatures', function () {
        var schema = effect_1.Schema.Struct({}, { key: effect_1.Schema.String, value: effect_1.Schema.Number });
        var object = (0, object_1.live)(schema, { unknownField: 1 });
        (0, vitest_1.expect)(function () { return setValue(object, 'field', '42'); }).to.throw();
        (0, vitest_1.expect)(function () { return setValue(object, 'unknown_field', 42); }).not.to.throw();
    });
    (0, vitest_1.test)('suspend', function () {
        var schema = effect_1.Schema.Struct({
            array: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return effect_1.Schema.Array(effect_1.Schema.Union(effect_1.Schema.Null, effect_1.Schema.Number)); })),
            object: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return effect_1.Schema.Union(effect_1.Schema.Null, effect_1.Schema.Struct({ field: effect_1.Schema.Number })); })),
        });
        var object = (0, object_1.live)(schema, { array: [1, 2, null], object: { field: 3 } });
        (0, vitest_1.expect)(function () { return setValue(object, 'object', { field: 4 }); }).not.to.throw();
        (0, vitest_1.expect)(function () { return setValue(object.object, 'field', 4); }).not.to.throw();
        (0, vitest_1.expect)(function () { return setValue(object.array, '0', 4); }).not.to.throw();
        (0, vitest_1.expect)(function () { return setValue(object.array, '0', '4'); }).to.throw();
    });
    (0, vitest_1.test)('nesting static objects with schema in the live object', function () {
        var contact1 = (0, internal_1.create)(testing_1.Testing.Contact, {
            name: 'Robert Smith',
            email: 'robert@example.com',
        });
        var contact2 = (0, internal_1.create)(testing_1.Testing.Contact, {
            name: 'Katy Perry',
            email: 'katy@example.com',
        });
        var contactBook = (0, object_1.live)({
            contacts: [contact1],
        });
        (0, vitest_1.expect)((0, internal_1.isInstanceOf)(testing_1.Testing.Contact, contactBook.contacts[0])).to.eq(true);
        (0, vitest_1.expect)((0, internal_1.getSchema)(contactBook.contacts[0])).to.eq(testing_1.Testing.Contact);
        contactBook.contacts.push(contact2);
        (0, vitest_1.expect)((0, internal_1.isInstanceOf)(testing_1.Testing.Contact, contactBook.contacts[1])).to.eq(true);
        (0, vitest_1.expect)((0, internal_1.getSchema)(contactBook.contacts[1])).to.eq(testing_1.Testing.Contact);
    });
    (0, vitest_1.test)('creating an object with data from another object', function () {
        var contact = (0, object_1.live)(testing_1.Testing.Contact, {
            name: 'Robert Smith',
            email: 'robert@example.com',
        });
        var TestSchema = effect_1.Schema.Struct({
            value: effect_1.Schema.Unknown,
        });
        var data = (0, object_1.live)(TestSchema, {
            value: contact,
        });
        (0, vitest_1.expect)(data.value.name).to.eq('Robert Smith');
    });
});
