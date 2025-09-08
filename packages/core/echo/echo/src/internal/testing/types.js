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
exports.Testing = void 0;
var effect_1 = require("effect");
var object_1 = require("../object");
var ref_1 = require("../ref");
// TODO(burdon): These are non-canonical test types, so we really shouldn't export and use in other classes (compare with @dxos/sdk/testing).
var Testing;
(function (Testing) {
    //
    // Primitives
    //
    var Circle = effect_1.Schema.Struct({ type: effect_1.Schema.Literal('circle'), radius: effect_1.Schema.Number });
    var Square = effect_1.Schema.Struct({ type: effect_1.Schema.Literal('square'), side: effect_1.Schema.Number });
    var Shape = effect_1.Schema.Union(Circle, Square);
    //
    // Simple types
    //
    var TestNestedSchema = effect_1.Schema.mutable(effect_1.Schema.Struct({ field: effect_1.Schema.String }));
    Testing.TestNestedType = TestNestedSchema.pipe((0, object_1.EchoObject)({ typename: 'example.com/type/TestNested', version: '0.1.0' }));
    //
    // Complex types
    // TODO(burdon): Change to Type.Obj.
    //
    var EmptySchemaType = /** @class */ (function (_super) {
        __extends(EmptySchemaType, _super);
        function EmptySchemaType() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return EmptySchemaType;
    }((0, object_1.TypedObject)({
        typename: 'example.com/type/Empty',
        version: '0.1.0',
    })({})));
    Testing.EmptySchemaType = EmptySchemaType;
    var fields = {
        string: effect_1.Schema.String,
        number: effect_1.Schema.Number,
        nullableShapeArray: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.Union(Shape, effect_1.Schema.Null))),
        boolean: effect_1.Schema.Boolean,
        null: effect_1.Schema.Null,
        undefined: effect_1.Schema.Undefined,
        stringArray: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.String)),
        twoDimNumberArray: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.Number)))),
        object: TestNestedSchema,
        objectArray: effect_1.Schema.mutable(effect_1.Schema.Array(TestNestedSchema)),
        nested: effect_1.Schema.optional((0, ref_1.Ref)(Testing.TestNestedType)),
        other: effect_1.Schema.Any,
    };
    Testing.TestSchema = effect_1.Schema.mutable(effect_1.Schema.partial(effect_1.Schema.Struct(fields)));
    var TestSchemaType = /** @class */ (function (_super) {
        __extends(TestSchemaType, _super);
        function TestSchemaType() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return TestSchemaType;
    }((0, object_1.TypedObject)({
        typename: 'example.com/type/Test',
        version: '0.1.0',
    })(fields, { partial: true }))); // TODO(burdon): Partial?
    Testing.TestSchemaType = TestSchemaType;
    // TODO(burdon): Why do we use need this rather then TestSchemaType?
    Testing.TestType = Testing.TestSchema.pipe((0, object_1.EchoObject)({
        typename: 'example.com/type/Test',
        version: '0.1.0',
    }));
    var TestClass = /** @class */ (function () {
        function TestClass() {
            this.field = 'value';
        }
        TestClass.prototype.toJSON = function () {
            return { field: this.field };
        };
        return TestClass;
    }());
    Testing.TestClass = TestClass;
    // TODO(dmaretskyi): Another top-level Schema.mutable call as a workaround for the regression in the last minor.
    Testing.TestSchemaWithClass = effect_1.Schema.mutable(effect_1.Schema.extend(Testing.TestSchema, effect_1.Schema.mutable(effect_1.Schema.Struct({
        classInstance: effect_1.Schema.optional(effect_1.Schema.instanceOf(TestClass)),
    }))));
    var Contact = /** @class */ (function (_super) {
        __extends(Contact, _super);
        function Contact() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Contact;
    }((0, object_1.TypedObject)({
        typename: 'example.com/type/Contact',
        version: '0.1.0',
    })({
        name: effect_1.Schema.String,
        username: effect_1.Schema.String,
        email: effect_1.Schema.String,
        tasks: effect_1.Schema.suspend(function () { return effect_1.Schema.mutable(effect_1.Schema.Array((0, ref_1.Ref)(Task))); }),
        address: effect_1.Schema.Struct({
            city: effect_1.Schema.optional(effect_1.Schema.String),
            state: effect_1.Schema.optional(effect_1.Schema.String),
            zip: effect_1.Schema.optional(effect_1.Schema.String),
            coordinates: effect_1.Schema.Struct({
                lat: effect_1.Schema.optional(effect_1.Schema.Number),
                lng: effect_1.Schema.optional(effect_1.Schema.Number),
            }),
        }),
    }, { partial: true })));
    Testing.Contact = Contact;
    var Task = /** @class */ (function (_super) {
        __extends(Task, _super);
        function Task() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Task;
    }((0, object_1.TypedObject)({
        typename: 'example.com/type/Task',
        version: '0.1.0',
    })({
        title: effect_1.Schema.optional(effect_1.Schema.String),
        completed: effect_1.Schema.optional(effect_1.Schema.Boolean),
        assignee: effect_1.Schema.optional((0, ref_1.Ref)(Contact)),
        previous: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return (0, ref_1.Ref)(Task); })),
        subTasks: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return (0, ref_1.Ref)(Task); })))),
        description: effect_1.Schema.optional(effect_1.Schema.String),
    }, { partial: true })));
    Testing.Task = Task;
    // TOOD(burdon): Ref$ breaks if using new syntax (since ID is not declared).
    // export const Task = Schema.Struct({
    //   title: Schema.String,
    //   completed: Schema.Boolean,
    //   assignee: Schema.optional(Ref(Schema.suspend((): Ref$<Contact> => Ref(Contact)))),
    //   previous: Schema.optional(Ref(Schema.suspend((): Ref$<Task> => Ref(Task)))),
    //   subTasks: Schema.optional(Schema.Array(Ref(Schema.suspend((): Ref$<Task> => Ref(Task))))),
    //   description: Schema.optional(Schema.String),
    // }).pipe(
    //   EchoObject({
    //     typename: 'example.com/type/Task',
    //     version: '0.1.0',
    //   }),
    // );
    // export type Task = Schema.Schema.Type<typeof Task>;
    // export const Contact = Schema.Struct({
    //   name: Schema.String,
    //   username: Schema.String,
    //   email: Schema.String,
    //   // TOOD(burdon): Should model via relations?
    //   // tasks: Schema.mutable(Schema.Array(Ref(Task))),
    //   address: Schema.Struct({
    //     city: Schema.optional(Schema.String),
    //     state: Schema.optional(Schema.String),
    //     zip: Schema.optional(Schema.String),
    //     coordinates: Schema.Struct({
    //       lat: Schema.optional(Schema.Number),
    //       lng: Schema.optional(Schema.Number),
    //     }),
    //   }),
    // }).pipe(
    //   EchoObject({
    //     typename: 'example.com/type/Contact',
    //     version: '0.1.0',
    //   }),
    // );
    // export type Contact = Schema.Schema.Type<typeof Contact>;
    var RecordType;
    (function (RecordType) {
        RecordType[RecordType["UNDEFINED"] = 0] = "UNDEFINED";
        RecordType[RecordType["PERSONAL"] = 1] = "PERSONAL";
        RecordType[RecordType["WORK"] = 2] = "WORK";
    })(RecordType = Testing.RecordType || (Testing.RecordType = {}));
    var Container = /** @class */ (function (_super) {
        __extends(Container, _super);
        function Container() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Container;
    }((0, object_1.TypedObject)({
        typename: 'example.com/type/Container',
        version: '0.1.0',
    })({
        objects: effect_1.Schema.mutable(effect_1.Schema.Array((0, ref_1.Ref)(object_1.Expando))),
        records: effect_1.Schema.mutable(effect_1.Schema.Array(effect_1.Schema.partial(effect_1.Schema.Struct({
            title: effect_1.Schema.String,
            description: effect_1.Schema.String,
            contacts: effect_1.Schema.mutable(effect_1.Schema.Array((0, ref_1.Ref)(Contact))),
            type: effect_1.Schema.Enums(RecordType),
        })))),
    }, { partial: true })));
    Testing.Container = Container;
    Testing.HasManager = effect_1.Schema.Struct({
        since: effect_1.Schema.optional(effect_1.Schema.String),
    }).pipe((0, object_1.EchoRelation)({
        typename: 'example.com/type/HasManager',
        version: '0.1.0',
        source: Contact,
        target: Contact,
    }));
})(Testing || (exports.Testing = Testing = {}));
