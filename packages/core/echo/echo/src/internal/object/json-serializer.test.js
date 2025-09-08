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
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
var ref_1 = require("../ref");
var testing_1 = require("../testing");
var accessors_1 = require("./accessors");
var create_1 = require("./create");
var json_serializer_1 = require("./json-serializer");
var meta_1 = require("./meta");
var model_1 = require("./model");
var typename_1 = require("./typename");
(0, vitest_1.describe)('Object JSON serializer', function () {
    (0, vitest_1.test)('should serialize and deserialize object', function () { return __awaiter(void 0, void 0, void 0, function () {
        var contact, task, contactJson, taskJson, refResolver, contactFromJson, taskFromJson, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    contact = (0, create_1.create)(testing_1.Testing.Contact, {
                        name: 'John Doe',
                    });
                    (0, meta_1.getMeta)(contact).keys.push({ id: '12345', source: 'crm.example.com' });
                    task = (0, create_1.create)(testing_1.Testing.Task, {
                        title: 'Polish my shoes',
                        assignee: ref_1.Ref.make(contact),
                    });
                    contactJson = (0, json_serializer_1.objectToJSON)(contact);
                    taskJson = (0, json_serializer_1.objectToJSON)(task);
                    (0, vitest_1.expect)(contactJson.id).toBe(contact.id);
                    (0, vitest_1.expect)(contactJson[model_1.ATTR_TYPE]).toEqual((0, ast_1.getSchemaDXN)(testing_1.Testing.Contact).toString());
                    (0, vitest_1.expect)(contactJson.name).toEqual('John Doe');
                    (0, vitest_1.expect)(taskJson.id).toBe(task.id);
                    (0, vitest_1.expect)(taskJson[model_1.ATTR_TYPE]).toEqual((0, ast_1.getSchemaDXN)(testing_1.Testing.Task).toString());
                    (0, vitest_1.expect)(taskJson.title).toEqual('Polish my shoes');
                    (0, vitest_1.expect)(taskJson.assignee).toEqual({ '/': keys_1.DXN.fromLocalObjectId(contact.id).toString() });
                    refResolver = new ref_1.StaticRefResolver()
                        .addSchema(testing_1.Testing.Contact)
                        .addSchema(testing_1.Testing.Task)
                        .addObject(contact)
                        .addObject(task);
                    return [4 /*yield*/, (0, json_serializer_1.objectFromJSON)(contactJson, { refResolver: refResolver })];
                case 1:
                    contactFromJson = (_e.sent());
                    return [4 /*yield*/, (0, json_serializer_1.objectFromJSON)(taskJson, { refResolver: refResolver })];
                case 2:
                    taskFromJson = (_e.sent());
                    (0, vitest_1.expect)(contactFromJson.id).toBe(contact.id);
                    (0, vitest_1.expect)(contactFromJson.name).toBe('John Doe');
                    (0, vitest_1.expect)(contactFromJson[model_1.TypeId]).toEqual((0, ast_1.getSchemaDXN)(testing_1.Testing.Contact));
                    (0, vitest_1.expect)(contactFromJson[model_1.EntityKindId]).toBe(ast_1.EntityKind.Object);
                    (0, vitest_1.expect)(contactFromJson[model_1.RelationSourceId]).toBeUndefined();
                    (0, vitest_1.expect)(contactFromJson[model_1.RelationTargetId]).toBeUndefined();
                    (0, vitest_1.expect)(contactFromJson[model_1.MetaId]).toEqual({
                        keys: [
                            {
                                id: '12345',
                                source: 'crm.example.com',
                            },
                        ],
                    });
                    (0, vitest_1.expect)((_b = (0, typename_1.getType)(contactFromJson)) === null || _b === void 0 ? void 0 : _b.toString()).toBe((0, ast_1.getSchemaDXN)(testing_1.Testing.Contact).toString());
                    (0, vitest_1.expect)((0, typename_1.getTypename)(contactFromJson)).toBe((0, ast_1.getSchemaTypename)(testing_1.Testing.Contact));
                    (0, vitest_1.expect)((_c = (0, accessors_1.getObjectDXN)(contactFromJson)) === null || _c === void 0 ? void 0 : _c.toString()).toEqual((_d = (0, accessors_1.getObjectDXN)(contact)) === null || _d === void 0 ? void 0 : _d.toString());
                    (0, vitest_1.expect)((0, accessors_1.getSchema)(contactFromJson)).toEqual(testing_1.Testing.Contact);
                    (0, vitest_1.expect)(taskFromJson.id).toBe(task.id);
                    (0, vitest_1.expect)(taskFromJson.title).toBe('Polish my shoes');
                    (0, vitest_1.expect)(taskFromJson.assignee.dxn).toEqual(keys_1.DXN.fromLocalObjectId(contact.id));
                    (0, vitest_1.expect)(taskFromJson.assignee.target).toEqual(contact);
                    _a = vitest_1.expect;
                    return [4 /*yield*/, taskFromJson.assignee.load()];
                case 3:
                    _a.apply(void 0, [_e.sent()]).toEqual(contact);
                    (0, vitest_1.expect)(taskFromJson[model_1.TypeId]).toEqual((0, ast_1.getSchemaDXN)(testing_1.Testing.Task));
                    (0, vitest_1.expect)(taskFromJson[model_1.EntityKindId]).toBe(ast_1.EntityKind.Object);
                    (0, vitest_1.expect)(taskFromJson[model_1.RelationSourceId]).toBeUndefined();
                    (0, vitest_1.expect)(taskFromJson[model_1.RelationTargetId]).toBeUndefined();
                    (0, vitest_1.expect)(taskFromJson[model_1.MetaId]).toEqual({ keys: [] });
                    (0, vitest_1.expect)((0, accessors_1.getSchema)(taskFromJson)).toEqual(testing_1.Testing.Task);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.test)('serialize with unresolved schema', function () { return __awaiter(void 0, void 0, void 0, function () {
        var contact, contactJson, contactFromJson;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contact = (0, create_1.create)(testing_1.Testing.Contact, {
                        name: 'John Doe',
                    });
                    contactJson = (0, json_serializer_1.objectToJSON)(contact);
                    return [4 /*yield*/, (0, json_serializer_1.objectFromJSON)(contactJson)];
                case 1:
                    contactFromJson = _a.sent();
                    (0, vitest_1.expect)(contactFromJson.id).toBe(contact.id);
                    (0, vitest_1.expect)(contactFromJson.name).toBe('John Doe');
                    (0, vitest_1.expect)((0, accessors_1.getSchema)(contactFromJson)).toBeUndefined();
                    (0, vitest_1.expect)((0, typename_1.getTypename)(contactFromJson)).toEqual((0, ast_1.getSchemaTypename)(testing_1.Testing.Contact));
                    (0, vitest_1.expect)((0, accessors_1.getObjectDXN)(contactFromJson)).toEqual((0, accessors_1.getObjectDXN)(contact));
                    (0, vitest_1.expect)((0, typename_1.getType)(contactFromJson)).toEqual((0, ast_1.getSchemaDXN)(testing_1.Testing.Contact));
                    return [2 /*return*/];
            }
        });
    }); });
});
