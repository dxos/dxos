"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
var testing_1 = require("../testing");
var types_1 = require("../types");
var accessors_1 = require("./accessors");
var create_1 = require("./create");
var json_serializer_1 = require("./json-serializer");
var model_1 = require("./model");
var typename_1 = require("./typename");
(0, vitest_1.describe)('create (static version)', function () {
    (0, vitest_1.test)('defaults', function (_a) {
        var expect = _a.expect;
        var Contact = effect_1.Schema.Struct({
            name: effect_1.Schema.String.pipe(effect_1.Schema.optional, effect_1.Schema.withConstructorDefault(function () { return 'Anonymous'; })),
            email: effect_1.Schema.String.pipe(effect_1.Schema.optional),
        });
        var obj = Contact.make({});
        expect(obj.name).toBe('Anonymous');
    });
    (0, vitest_1.test)('create static object', function () {
        var _a;
        var contact = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        (0, vitest_1.expect)(contact.id).toBeDefined();
        (0, vitest_1.expect)(contact.name).toBe('Bot');
        (0, vitest_1.expect)(contact.email).toBe('bot@example.com');
        (0, vitest_1.expect)(contact['@type']).toBeUndefined();
        (0, vitest_1.expect)((_a = (0, typename_1.getType)(contact)) === null || _a === void 0 ? void 0 : _a.toString()).toBe((0, ast_1.getSchemaDXN)(testing_1.Testing.Contact).toString());
        (0, vitest_1.expect)((0, types_1.isInstanceOf)(testing_1.Testing.Contact, contact)).toBe(true);
    });
    (0, vitest_1.test)('JSON encoding', function () {
        var contact = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        var json = JSON.parse(JSON.stringify(contact));
        (0, vitest_1.expect)(json).toEqual({
            id: contact.id,
            '@type': keys_1.DXN.fromTypenameAndVersion(testing_1.Testing.Contact.typename, testing_1.Testing.Contact.version).toString(),
            '@meta': {
                keys: [],
            },
            name: 'Bot',
            email: 'bot@example.com',
        });
        (0, vitest_1.expect)((0, json_serializer_1.objectToJSON)(contact)).toStrictEqual(json);
    });
    (0, vitest_1.test)('JSON encoding with relation', function () {
        var _a;
        var contactA = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        var contactB = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        var hasManager = (0, create_1.create)(testing_1.Testing.HasManager, (_a = {},
            _a[model_1.RelationSourceId] = contactA,
            _a[model_1.RelationTargetId] = contactB,
            _a));
        var json = JSON.parse(JSON.stringify(hasManager));
        (0, vitest_1.expect)(json).toEqual({
            id: hasManager.id,
            '@type': keys_1.DXN.fromTypenameAndVersion(testing_1.Testing.HasManager.typename, testing_1.Testing.HasManager.version).toString(),
            '@relationSource': keys_1.DXN.fromLocalObjectId(contactA.id).toString(),
            '@relationTarget': keys_1.DXN.fromLocalObjectId(contactB.id).toString(),
            '@meta': {
                keys: [],
            },
        });
    });
    (0, vitest_1.test)('getSchema', function () {
        var contact = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        (0, vitest_1.expect)((0, accessors_1.getSchema)(contact)).toBe(testing_1.Testing.Contact);
    });
    (0, vitest_1.test)('inspect', function () {
        var contact = (0, create_1.create)(testing_1.Testing.Contact, {
            name: 'Bot',
            email: 'bot@example.com',
        });
        // console.log(contact);
        var text = (0, util_1.inspect)(contact);
        (0, vitest_1.expect)(text).toContain('Bot');
        (0, vitest_1.expect)(text).toContain('bot@example.com');
        (0, vitest_1.expect)(text).toContain('example.com/type/Contact');
        (0, vitest_1.expect)(text).toContain('0.1.0');
    });
});
