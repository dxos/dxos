"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.Testing = void 0;
var effect_1 = require("effect");
var __1 = require("..");
// TODO(burdon): These are non-canonical test types, so we really shouldn't export and use in other classes (compare with @dxos/sdk/testing).
var Testing;
(function (Testing) {
    var _Contact = effect_1.Schema.Struct({
        name: effect_1.Schema.String,
        username: effect_1.Schema.String,
        email: effect_1.Schema.String,
        tasks: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return __1.Type.Ref(Testing.Task); }))),
        address: effect_1.Schema.Struct({
            city: effect_1.Schema.optional(effect_1.Schema.String),
            state: effect_1.Schema.optional(effect_1.Schema.String),
            zip: effect_1.Schema.optional(effect_1.Schema.String),
            coordinates: effect_1.Schema.Struct({
                lat: effect_1.Schema.optional(effect_1.Schema.Number),
                lng: effect_1.Schema.optional(effect_1.Schema.Number),
            }),
        }),
    }).pipe(effect_1.Schema.partial, __1.Type.Obj({
        typename: 'example.com/type/Contact',
        version: '0.1.0',
    }));
    Testing.Contact = _Contact;
    var _Task = effect_1.Schema.Struct({
        title: effect_1.Schema.optional(effect_1.Schema.String),
        completed: effect_1.Schema.optional(effect_1.Schema.Boolean),
        assignee: effect_1.Schema.optional(__1.Type.Ref(Testing.Contact)),
        previous: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return __1.Type.Ref(Testing.Task); })),
        subTasks: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return __1.Type.Ref(Testing.Task); })))),
        description: effect_1.Schema.optional(effect_1.Schema.String),
    }).pipe(effect_1.Schema.partial, __1.Type.Obj({
        typename: 'example.com/type/Task',
        version: '0.1.0',
    }));
    Testing.Task = _Task;
    var RecordType;
    (function (RecordType) {
        RecordType[RecordType["UNDEFINED"] = 0] = "UNDEFINED";
        RecordType[RecordType["PERSONAL"] = 1] = "PERSONAL";
        RecordType[RecordType["WORK"] = 2] = "WORK";
    })(RecordType = Testing.RecordType || (Testing.RecordType = {}));
    Testing.Container = effect_1.Schema.Struct({
        objects: effect_1.Schema.mutable(effect_1.Schema.Array(__1.Type.Ref(__1.Type.Expando))),
        records: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.partial(effect_1.Schema.Struct({
            title: effect_1.Schema.String,
            description: effect_1.Schema.String,
            contacts: effect_1.Schema.mutable(effect_1.Schema.Array(__1.Type.Ref(Testing.Contact))),
            type: effect_1.Schema.Enums(RecordType),
        })))),
    }).pipe(effect_1.Schema.partial, __1.Type.Obj({
        typename: 'example.com/type/Container',
        version: '0.1.0',
    }));
    Testing.WorksFor = effect_1.Schema.Struct({
        since: effect_1.Schema.optional(effect_1.Schema.String),
    }).pipe(__1.Type.Relation({
        typename: 'example.com/type/WorksFor',
        version: '0.1.0',
        source: Testing.Contact,
        target: Testing.Contact,
    }));
})(Testing || (exports.Testing = Testing = {}));
