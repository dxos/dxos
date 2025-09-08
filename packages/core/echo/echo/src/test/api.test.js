"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var debug_1 = require("@dxos/debug");
var internal_1 = require("@dxos/echo/internal");
var index_1 = require("../index");
var Testing;
(function (Testing) {
    Testing.Organization = effect_1.Schema.Struct({
        id: index_1.Type.ObjectId,
        name: effect_1.Schema.String,
    }).pipe(index_1.Type.Obj({
        typename: 'example.com/type/Organization',
        version: '0.1.0',
    }));
    Testing.Person = effect_1.Schema.Struct({
        name: effect_1.Schema.String,
        dob: effect_1.Schema.optional(effect_1.Schema.String),
        email: effect_1.Schema.optional(effect_1.Schema.String.pipe(internal_1.FormatAnnotation.set(internal_1.FormatEnum.Email))),
        organization: effect_1.Schema.optional(index_1.Type.Ref(Testing.Organization)),
    }).pipe(index_1.Type.Obj({
        typename: 'example.com/type/Person',
        version: '0.1.0',
    }));
    // export const WorksFor = S.Struct({
    //   id: Type.ObjectId,
    //   since: S.String,
    //   jobTitle: S.String,
    //   ...Range({ from, to }),
    //   ...Provenance({ source: 'duckduckgo.com', confidence: 0.9 }), // keys
    //   ...Relation.make({ source: Contact, target: Organization }),
    // }).pipe(
    //   Type.Relation({
    //     typename: 'example.com/relation/WorksFor',
    //     version: '0.1.0',
    //   }),
    // );
    // {
    //   const contact = db.add(create(Contact, { name: 'Test' }));
    //   const organization = db.add(create(Organization, { name: 'DXOS' }));
    //   db.add(create(WorksFor, { source: contact, target: organization }));
    // }
    Testing.WorksFor = effect_1.Schema.Struct({
        // id: Type.ObjectId,
        role: effect_1.Schema.String,
    }).pipe(index_1.Type.Relation({
        typename: 'example.com/relation/WorksFor',
        version: '0.1.0',
        source: Testing.Person,
        target: Testing.Organization,
    }));
    // TODO(burdon): Fix (Type.Obj currently removes TypeLiteral that implements the `make` function).
    //  Property 'make' does not exist on type 'EchoObjectSchema<Struct<{ timestamp: PropertySignature<":", string, never, ":", string, true, never>; }>>'.ts(2339)
    Testing.MessageStruct = effect_1.Schema.Struct({
        // TODO(burdon): Support S.Date; Custom Timestamp (with defaults).
        // TODO(burdon): Support defaults (update create and create).
        timestamp: effect_1.Schema.String.pipe(effect_1.Schema.propertySignature, effect_1.Schema.withConstructorDefault(function () { return new Date().toISOString(); })),
    });
    Testing.Message = Testing.MessageStruct.pipe(index_1.Type.Obj({
        typename: 'example.com/type/Message',
        version: '0.1.0',
    }));
})(Testing || (Testing = {}));
(0, vitest_1.describe)('Experimental API review', function () {
    (0, vitest_1.test)('type checks', function (_a) {
        var _b, _c;
        var expect = _a.expect;
        var contact = index_1.Obj.make(Testing.Person, { name: 'Test' });
        var type = (_b = index_1.Obj.getSchema(contact)) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new Error('No schema found'));
        expect((_c = index_1.Type.getDXN(type)) === null || _c === void 0 ? void 0 : _c.typename).to.eq(Testing.Person.typename);
        expect(index_1.Type.getTypename(type)).to.eq('example.com/type/Person');
        expect(index_1.Type.getVersion(type)).to.eq('0.1.0');
        expect(index_1.Type.getMeta(type)).to.deep.eq({
            kind: index_1.Type.Kind.Object,
            typename: 'example.com/type/Person',
            version: '0.1.0',
        });
    });
    (0, vitest_1.test)('instance checks', function (_a) {
        var expect = _a.expect;
        var organization = index_1.Obj.make(Testing.Organization, { name: 'DXOS' });
        var contact = index_1.Obj.make(Testing.Person, {
            name: 'Test',
            organization: index_1.Ref.make(organization),
        });
        expect(effect_1.Schema.is(Testing.Person)(contact)).to.be.true;
        expect(index_1.Obj.instanceOf(Testing.Person, contact)).to.be.true;
        expect(index_1.Obj.instanceOf(Testing.Organization, organization)).to.be.true;
        var isPerson = index_1.Obj.instanceOf(Testing.Person);
        var x = {};
        if (isPerson(x)) {
            x.name;
        }
    });
    (0, vitest_1.test)('default props', function (_a) {
        var expect = _a.expect;
        var message = index_1.Obj.make(Testing.Message, Testing.MessageStruct.make({}));
        expect(message.timestamp).to.exist;
    });
    (0, vitest_1.test)('Obj.isObject', function (_a) {
        var expect = _a.expect;
        var guy = index_1.Obj.make(Testing.Person, { name: 'Test' });
        expect(index_1.Obj.isObject(guy)).to.be.true;
        expect(index_1.Obj.isObject(null)).to.be.false;
        expect(index_1.Obj.isObject(undefined)).to.be.false;
        expect(index_1.Obj.isObject(1)).to.be.false;
        expect(index_1.Obj.isObject('string')).to.be.false;
    });
    (0, vitest_1.test)('create relation', function (_a) {
        var _b;
        var expect = _a.expect;
        var person = index_1.Obj.make(Testing.Person, { name: 'Test' });
        var organization = index_1.Obj.make(Testing.Organization, { name: 'DXOS' });
        var worksFor = index_1.Relation.make(Testing.WorksFor, (_b = {},
            _b[index_1.Relation.Source] = person,
            _b[index_1.Relation.Target] = organization,
            _b.role = 'CEO',
            _b));
        expect(index_1.Relation.getSource(worksFor)).to.eq(person);
        expect(index_1.Relation.getTarget(worksFor)).to.eq(organization);
    });
    vitest_1.test.skip('type narrowing', function () {
        var a = null;
        {
            if (index_1.Obj.isObject(a)) {
                a;
            }
            else {
                a;
            }
        }
        {
            if (index_1.Relation.isRelation(a)) {
                a;
            }
            else {
                a;
            }
        }
    });
});
