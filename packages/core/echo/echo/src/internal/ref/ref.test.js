"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var keys_1 = require("@dxos/keys");
var object_1 = require("../object");
var ref_1 = require("./ref");
var Task = effect_1.Schema.Struct({
    title: effect_1.Schema.optional(effect_1.Schema.String),
}).pipe((0, object_1.EchoObject)({
    typename: 'example.com/type/Task',
    version: '0.1.0',
}));
var Contact = effect_1.Schema.Struct({
    name: effect_1.Schema.String,
    email: effect_1.Schema.optional(effect_1.Schema.String),
    tasks: effect_1.Schema.mutable(effect_1.Schema.Array((0, ref_1.Ref)(Task))),
}).pipe((0, object_1.EchoObject)({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
}));
(0, vitest_1.describe)('Ref', function () {
    (0, vitest_1.test)('Schema is', function () {
        (0, ref_1.Ref)(Contact).pipe(effect_1.Schema.is)(ref_1.Ref.fromDXN(keys_1.DXN.parse("dxn:echo:@:".concat(keys_1.ObjectId.random()))));
    });
    // TODO(dmaretskyi): Figure out how to expose this in the API.
    vitest_1.test.skip('encode with inlined target', function () {
        var task = (0, object_1.create)(Task, { title: 'Fix bugs' });
        var contact = (0, object_1.create)(Contact, { name: 'John Doe', tasks: [ref_1.Ref.make(task)] });
        var json = JSON.parse(JSON.stringify(contact));
        (0, vitest_1.expect)(json).toEqual({
            id: contact.id,
            '@type': "dxn:type:".concat(Contact.typename, ":").concat(Contact.version),
            '@meta': {
                keys: [],
            },
            name: 'John Doe',
            tasks: [
                {
                    '/': (0, object_1.getObjectDXN)(task).toString(),
                    target: JSON.parse(JSON.stringify(task)),
                },
            ],
        });
    });
    (0, vitest_1.test)('encode without inlining target', function () {
        var task = (0, object_1.create)(Task, { title: 'Fix bugs' });
        var contact = (0, object_1.create)(Contact, { name: 'John Doe', tasks: [ref_1.Ref.make(task).noInline()] });
        var json = JSON.parse(JSON.stringify(contact));
        (0, vitest_1.expect)(json).toEqual({
            id: contact.id,
            '@type': "dxn:type:".concat(Contact.typename, ":").concat(Contact.version),
            '@meta': {
                keys: [],
            },
            name: 'John Doe',
            tasks: [{ '/': (0, object_1.getObjectDXN)(task).toString() }],
        });
    });
    (0, vitest_1.test)('decode object', function () {
        var id = keys_1.ObjectId.random();
        var contactData = {
            id: keys_1.ObjectId.random(),
            name: 'John Doe',
            tasks: [{ '/': "dxn:echo:@:".concat(id) }],
        };
        var contact = Contact.pipe(effect_1.Schema.decodeUnknownSync)(contactData);
        (0, vitest_1.expect)(ref_1.Ref.isRef(contact.tasks[0])).toEqual(true);
        (0, vitest_1.expect)(contact.tasks[0].dxn.toString()).toEqual("dxn:echo:@:".concat(id));
    });
});
