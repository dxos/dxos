"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var echo_protocol_1 = require("@dxos/echo-protocol");
var keys_1 = require("@dxos/keys");
var log_1 = require("@dxos/log");
var Obj = require("../Obj");
var Ref = require("../Ref");
var Type = require("../Type");
var dsl_1 = require("./dsl");
//
// Example schema
//
// TODO(dmaretskyi): Need common set of test types.
var Person = effect_1.Schema.Struct({
    name: effect_1.Schema.String,
    email: effect_1.Schema.optional(effect_1.Schema.String),
    age: effect_1.Schema.optional(effect_1.Schema.Number),
}).pipe(Type.Obj({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
}));
var Organization = effect_1.Schema.Struct({
    name: effect_1.Schema.String,
}).pipe(Type.Obj({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
}));
var WorksFor = effect_1.Schema.Struct({
    since: effect_1.Schema.String,
}).pipe(Type.Relation({
    typename: 'dxos.org/type/WorksFor',
    version: '0.1.0',
    source: Person,
    target: Organization,
}));
var Task = effect_1.Schema.Struct({
    title: effect_1.Schema.String,
    createdAt: effect_1.Schema.String,
    assignee: effect_1.Schema.optional(Type.Ref(Person)),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
//
// Example queries
//
(0, vitest_1.describe)('query api', function () {
    (0, vitest_1.test)('get all people', function () {
        var getAllPeople = dsl_1.Query.type(Person);
        (0, log_1.log)('query', { ast: getAllPeople.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(getAllPeople.ast);
        console.log('getAllPeople', JSON.stringify(getAllPeople.ast, null, 2));
    });
    (0, vitest_1.test)('get all people named Fred', function () {
        var PeopleNamedFred = dsl_1.Query.select(dsl_1.Filter.type(Person, { name: 'Fred' }));
        (0, log_1.log)('query', { ast: PeopleNamedFred.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(PeopleNamedFred.ast);
        console.log('PeopleNamedFred', JSON.stringify(PeopleNamedFred.ast, null, 2));
    });
    (0, vitest_1.test)('get all orgs Fred worked for since 2020', function () {
        var fred = Obj.make(Person, { name: 'Fred' });
        var OrganizationsFredWorkedForSince2020 = dsl_1.Query.select(dsl_1.Filter.type(Person, { id: fred.id }))
            .sourceOf(WorksFor, { since: dsl_1.Filter.gt('2020') })
            .target();
        (0, log_1.log)('query', { ast: OrganizationsFredWorkedForSince2020.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(OrganizationsFredWorkedForSince2020.ast);
        console.log('OrganizationsFredWorkedForSince2020', JSON.stringify(OrganizationsFredWorkedForSince2020.ast, null, 2));
    });
    (0, vitest_1.test)('get all tasks for Fred', function () {
        var fred = Obj.make(Person, { name: 'Fred' });
        var TasksForFred = dsl_1.Query.select(dsl_1.Filter.type(Person, { id: fred.id })).referencedBy(Task, 'assignee');
        (0, log_1.log)('query', { ast: TasksForFred.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(TasksForFred.ast);
        console.log('TasksForFred', JSON.stringify(TasksForFred.ast, null, 2));
    });
    (0, vitest_1.test)('get all tasks for employees of Cyberdyne', function () {
        var TasksForEmployeesOfCyberdyne = dsl_1.Query.select(dsl_1.Filter.type(Organization, { name: 'Cyberdyne' }))
            .targetOf(WorksFor)
            .source()
            .referencedBy(Task, 'assignee');
        (0, log_1.log)('query', { ast: TasksForEmployeesOfCyberdyne.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(TasksForEmployeesOfCyberdyne.ast);
        console.log('TasksForEmployeesOfCyberdyne', JSON.stringify(TasksForEmployeesOfCyberdyne.ast, null, 2));
    });
    (0, vitest_1.test)('get all people or orgs', function () {
        var PeopleOrOrganizations = dsl_1.Query.all(dsl_1.Query.select(dsl_1.Filter.type(Person)), dsl_1.Query.select(dsl_1.Filter.type(Organization)));
        (0, log_1.log)('query', { ast: PeopleOrOrganizations.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(PeopleOrOrganizations.ast);
        console.log('PeopleOrOrganizations', JSON.stringify(PeopleOrOrganizations.ast, null, 2));
    });
    (0, vitest_1.test)('get all people not in orgs', function () {
        var PeopleNotInOrganizations = dsl_1.Query.without(dsl_1.Query.select(dsl_1.Filter.type(Person)), dsl_1.Query.select(dsl_1.Filter.type(Person)).sourceOf(WorksFor).source());
        (0, log_1.log)('query', { ast: PeopleNotInOrganizations.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(PeopleNotInOrganizations.ast);
        console.log('PeopleNotInOrganizations', JSON.stringify(PeopleNotInOrganizations.ast, null, 2));
    });
    (0, vitest_1.test)('get assignees of all tasks created after 2020', function () {
        var AssigneesOfAllTasksCreatedAfter2020 = dsl_1.Query.select(dsl_1.Filter.type(Task, { createdAt: dsl_1.Filter.gt('2020') })).reference('assignee');
        (0, log_1.log)('query', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(AssigneesOfAllTasksCreatedAfter2020.ast);
        console.log('AssigneesOfAllTasksCreatedAfter2020', JSON.stringify(AssigneesOfAllTasksCreatedAfter2020.ast, null, 2));
    });
    (0, vitest_1.test)('untyped full-text search', function () {
        var contactFullTextSearch = dsl_1.Query.select(dsl_1.Filter.text('Bill'));
        (0, log_1.log)('query', { ast: contactFullTextSearch.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(contactFullTextSearch.ast);
        (0, vitest_1.expect)(contactFullTextSearch.ast).toMatchInlineSnapshot("\n      {\n        \"filter\": {\n          \"searchKind\": undefined,\n          \"text\": \"Bill\",\n          \"type\": \"text-search\",\n        },\n        \"type\": \"select\",\n      }\n    ");
    });
    (0, vitest_1.test)('typed full-text search', function () {
        var contactFullTextSearch = dsl_1.Query.select(dsl_1.Filter.type(Person)).select(dsl_1.Filter.text('Bill'));
        (0, log_1.log)('query', { ast: contactFullTextSearch.ast });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(contactFullTextSearch.ast);
        (0, vitest_1.expect)(contactFullTextSearch.ast).toMatchInlineSnapshot("\n      {\n        \"filter\": {\n          \"searchKind\": undefined,\n          \"text\": \"Bill\",\n          \"type\": \"text-search\",\n        },\n        \"selection\": {\n          \"filter\": {\n            \"id\": undefined,\n            \"props\": {},\n            \"type\": \"object\",\n            \"typename\": \"dxn:type:dxos.org/type/Person:0.1.0\",\n          },\n          \"type\": \"select\",\n        },\n        \"type\": \"filter\",\n      }\n    ");
    });
    (0, vitest_1.test)('filter by ref', function () {
        var fred = Obj.make(Person, { name: 'Fred' });
        var tasksByFred = dsl_1.Filter.type(Task, { assignee: Ref.make(fred) });
        (0, vitest_1.expect)(tasksByFred.ast).toEqual({
            props: {
                assignee: {
                    operator: 'eq',
                    type: 'compare',
                    value: {
                        '/': keys_1.DXN.fromLocalObjectId(fred.id).toString(),
                    },
                },
            },
            type: 'object',
            typename: 'dxn:type:dxos.org/type/Task:0.1.0',
        });
        console.log('tasksByFred', JSON.stringify(tasksByFred.ast, null, 2));
    });
    (0, vitest_1.test)('select orgs and people', function () {
        var orgsAndPeople = dsl_1.Query.select(dsl_1.Filter.or(dsl_1.Filter.type(Organization), dsl_1.Filter.type(Person)));
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(orgsAndPeople.ast);
        (0, vitest_1.expect)(orgsAndPeople.ast).toMatchInlineSnapshot("\n      {\n        \"filter\": {\n          \"filters\": [\n            {\n              \"id\": undefined,\n              \"props\": {},\n              \"type\": \"object\",\n              \"typename\": \"dxn:type:dxos.org/type/Organization:0.1.0\",\n            },\n            {\n              \"id\": undefined,\n              \"props\": {},\n              \"type\": \"object\",\n              \"typename\": \"dxn:type:dxos.org/type/Person:0.1.0\",\n            },\n          ],\n          \"type\": \"or\",\n        },\n        \"type\": \"select\",\n      }\n    ");
    });
    (0, vitest_1.test)('select everything but orgs and people', function () {
        var everythingButOrgsAndPeople = dsl_1.Query.select(dsl_1.Filter.not(dsl_1.Filter.or(dsl_1.Filter.type(Organization), dsl_1.Filter.type(Person))));
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(everythingButOrgsAndPeople.ast);
        (0, vitest_1.expect)(everythingButOrgsAndPeople.ast).toMatchInlineSnapshot("\n      {\n        \"filter\": {\n          \"filter\": {\n            \"filters\": [\n              {\n                \"id\": undefined,\n                \"props\": {},\n                \"type\": \"object\",\n                \"typename\": \"dxn:type:dxos.org/type/Organization:0.1.0\",\n              },\n              {\n                \"id\": undefined,\n                \"props\": {},\n                \"type\": \"object\",\n                \"typename\": \"dxn:type:dxos.org/type/Person:0.1.0\",\n              },\n            ],\n            \"type\": \"or\",\n          },\n          \"type\": \"not\",\n        },\n        \"type\": \"select\",\n      }\n    ");
    });
    (0, vitest_1.test)('select deleted tasks', function () {
        var deletedTasks = dsl_1.Query.select(dsl_1.Filter.type(Task)).options({
            deleted: 'only',
        });
        effect_1.Schema.validateSync(echo_protocol_1.QueryAST.Query)(deletedTasks.ast);
        (0, vitest_1.expect)(deletedTasks.ast).toMatchInlineSnapshot("\n      {\n        \"options\": {\n          \"deleted\": \"only\",\n        },\n        \"query\": {\n          \"filter\": {\n            \"id\": undefined,\n            \"props\": {},\n            \"type\": \"object\",\n            \"typename\": \"dxn:type:dxos.org/type/Task:0.1.0\",\n          },\n          \"type\": \"select\",\n        },\n        \"type\": \"options\",\n      }\n    ");
    });
    vitest_1.test.skip('chain', function () {
        // NOTE: Can't support props without type since they can't be inferred.
        // const f1: Filter<Person> = Filter.props({ name: 'Fred' });
        // const x = Query.select(Filter.props({ id: '123' }));
        var y = dsl_1.Query.select(dsl_1.Filter.type(Person));
        var or = dsl_1.Filter.or(dsl_1.Filter.type(Person, { id: dsl_1.Filter.in('1', '2', '3') }), dsl_1.Filter.type(Organization));
        var and = dsl_1.Filter.and(dsl_1.Filter.type(Person, { id: dsl_1.Filter.in('1', '2', '3') }), dsl_1.Filter.type(Person, { name: 'Fred' }));
        var q = dsl_1.Query
            //
            // NOTE: Can't support functions since they can't be serialized (to server).
            // .filter((object) => Math.random() > 0.5)
            .select(dsl_1.Filter.type(Person))
            .select(dsl_1.Filter.type(Person, { name: 'Fred' }))
            .select({ age: dsl_1.Filter.between(20, 40) })
            .select(dsl_1.Filter.and(dsl_1.Filter.type(Person), dsl_1.Filter.type(Person, { name: dsl_1.Filter.in('bob', 'bill') })));
        (0, log_1.log)('stuff', { fOr: or, fAnd: and, q: q, y: y });
    });
});
