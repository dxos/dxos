"use strict";
//
// Copyright 2025 DXOS.org
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = exports.Filter = void 0;
var effect_1 = require("effect");
var debug_1 = require("@dxos/debug");
var internal_1 = require("@dxos/echo/internal");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var Ref = require("../Ref");
var FilterClass = /** @class */ (function () {
    function FilterClass(ast) {
        this.ast = ast;
        this['~Filter'] = FilterClass.variance;
    }
    FilterClass.is = function (value) {
        return typeof value === 'object' && value !== null && '~Filter' in value;
    };
    FilterClass.everything = function () {
        return new FilterClass({
            type: 'object',
            typename: null,
            props: {},
        });
    };
    FilterClass.nothing = function () {
        return new FilterClass({
            type: 'not',
            filter: {
                type: 'object',
                typename: null,
                props: {},
            },
        });
    };
    FilterClass.relation = function () {
        return new FilterClass({
            type: 'object',
            typename: null,
            props: {},
        });
    };
    FilterClass.ids = function () {
        var ids = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ids[_i] = arguments[_i];
        }
        (0, invariant_1.assertArgument)(ids.every(function (id) { return keys_1.ObjectId.isValid(id); }), 'ids must be valid');
        if (ids.length === 0) {
            return exports.Filter.nothing();
        }
        return new FilterClass({
            type: 'object',
            typename: null,
            id: ids,
            props: {},
        });
    };
    FilterClass.type = function (schema, props) {
        var _a, _b;
        var dxn = (_b = (_a = (0, internal_1.getTypeReference)(schema)) === null || _a === void 0 ? void 0 : _a.toDXN()) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new TypeError('Schema has no DXN'));
        return new FilterClass(__assign({ type: 'object', typename: dxn.toString() }, propsFilterToAst(props !== null && props !== void 0 ? props : {})));
    };
    FilterClass.typename = function (typename) {
        (0, invariant_1.assertArgument)(!typename.startsWith('dxn:'), 'Typename must no be qualified');
        return new FilterClass({
            type: 'object',
            typename: keys_1.DXN.fromTypename(typename).toString(),
            props: {},
        });
    };
    FilterClass.typeDXN = function (dxn) {
        return new FilterClass({
            type: 'object',
            typename: dxn.toString(),
            props: {},
        });
    };
    /**
     * @internal
     */
    FilterClass._props = function (props) {
        return new FilterClass(__assign({ type: 'object', typename: null }, propsFilterToAst(props)));
    };
    FilterClass.text = function (text, options) {
        return new FilterClass({
            type: 'text-search',
            text: text,
            searchKind: options === null || options === void 0 ? void 0 : options.type,
        });
    };
    FilterClass.foreignKeys = function (schema, keys) {
        var _a, _b;
        var dxn = (_b = (_a = (0, internal_1.getTypeReference)(schema)) === null || _a === void 0 ? void 0 : _a.toDXN()) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new TypeError('Schema has no DXN'));
        return new FilterClass({
            type: 'object',
            typename: dxn.toString(),
            props: {},
            foreignKeys: keys,
        });
    };
    FilterClass.eq = function (value) {
        if (!Ref.isRef(value) && typeof value === 'object' && value !== null) {
            throw new TypeError('Cannot use object as a value for eq filter');
        }
        return new FilterClass({
            type: 'compare',
            operator: 'eq',
            value: Ref.isRef(value) ? value.noInline().encode() : value,
        });
    };
    FilterClass.neq = function (value) {
        return new FilterClass({
            type: 'compare',
            operator: 'neq',
            value: value,
        });
    };
    FilterClass.gt = function (value) {
        return new FilterClass({
            type: 'compare',
            operator: 'gt',
            value: value,
        });
    };
    FilterClass.gte = function (value) {
        return new FilterClass({
            type: 'compare',
            operator: 'gte',
            value: value,
        });
    };
    FilterClass.lt = function (value) {
        return new FilterClass({
            type: 'compare',
            operator: 'lt',
            value: value,
        });
    };
    FilterClass.lte = function (value) {
        return new FilterClass({
            type: 'compare',
            operator: 'lte',
            value: value,
        });
    };
    FilterClass.in = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return new FilterClass({
            type: 'in',
            values: values,
        });
    };
    FilterClass.between = function (from, to) {
        return new FilterClass({
            type: 'range',
            from: from,
            to: to,
        });
    };
    FilterClass.not = function (filter) {
        return new FilterClass({
            type: 'not',
            filter: filter.ast,
        });
    };
    FilterClass.and = function () {
        var filters = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            filters[_i] = arguments[_i];
        }
        return new FilterClass({
            type: 'and',
            filters: filters.map(function (f) { return f.ast; }),
        });
    };
    FilterClass.or = function () {
        var filters = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            filters[_i] = arguments[_i];
        }
        return new FilterClass({
            type: 'or',
            filters: filters.map(function (f) { return f.ast; }),
        });
    };
    FilterClass.variance = {};
    return FilterClass;
}());
exports.Filter = FilterClass;
var propsFilterToAst = function (predicates) {
    var idFilter;
    if ('id' in predicates) {
        (0, invariant_1.assertArgument)(typeof predicates.id === 'string' || Array.isArray(predicates.id), 'invalid id filter');
        idFilter = typeof predicates.id === 'string' ? [predicates.id] : predicates.id;
        effect_1.Schema.Array(keys_1.ObjectId).pipe(effect_1.Schema.validateSync)(idFilter);
    }
    return {
        id: idFilter,
        props: Object.fromEntries(Object.entries(predicates)
            .filter(function (_a) {
            var prop = _a[0], _value = _a[1];
            return prop !== 'id';
        })
            .map(function (_a) {
            var prop = _a[0], predicate = _a[1];
            return [prop, exports.Filter.is(predicate) ? predicate.ast : exports.Filter.eq(predicate).ast];
        })),
    };
};
var QueryClass = /** @class */ (function () {
    function QueryClass(ast) {
        this.ast = ast;
        this['~Query'] = QueryClass.variance;
    }
    QueryClass.is = function (value) {
        return typeof value === 'object' && value !== null && '~Query' in value;
    };
    QueryClass.select = function (filter) {
        return new QueryClass({
            type: 'select',
            filter: filter.ast,
        });
    };
    QueryClass.type = function (schema, predicates) {
        return new QueryClass({
            type: 'select',
            filter: FilterClass.type(schema, predicates).ast,
        });
    };
    QueryClass.all = function () {
        var queries = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            queries[_i] = arguments[_i];
        }
        if (queries.length === 0) {
            throw new TypeError('Query.all combines results of multiple queries, to query all objects use Query.select(Filter.everything())');
        }
        return new QueryClass({
            type: 'union',
            queries: queries.map(function (q) { return q.ast; }),
        });
    };
    QueryClass.without = function (source, exclude) {
        return new QueryClass({
            type: 'set-difference',
            source: source.ast,
            exclude: exclude.ast,
        });
    };
    QueryClass.prototype.select = function (filter) {
        if (exports.Filter.is(filter)) {
            return new QueryClass({
                type: 'filter',
                selection: this.ast,
                filter: filter.ast,
            });
        }
        else {
            return new QueryClass({
                type: 'filter',
                selection: this.ast,
                filter: FilterClass._props(filter).ast,
            });
        }
    };
    QueryClass.prototype.reference = function (key) {
        return new QueryClass({
            type: 'reference-traversal',
            anchor: this.ast,
            property: key,
        });
    };
    QueryClass.prototype.referencedBy = function (target, key) {
        var _a, _b;
        var dxn = (_b = (_a = (0, internal_1.getTypeReference)(target)) === null || _a === void 0 ? void 0 : _a.toDXN()) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new TypeError('Target schema has no DXN'));
        return new QueryClass({
            type: 'incoming-references',
            anchor: this.ast,
            property: key,
            typename: dxn.toString(),
        });
    };
    QueryClass.prototype.sourceOf = function (relation, predicates) {
        return new QueryClass({
            type: 'relation',
            anchor: this.ast,
            direction: 'outgoing',
            filter: FilterClass.type(relation, predicates).ast,
        });
    };
    QueryClass.prototype.targetOf = function (relation, predicates) {
        return new QueryClass({
            type: 'relation',
            anchor: this.ast,
            direction: 'incoming',
            filter: FilterClass.type(relation, predicates).ast,
        });
    };
    QueryClass.prototype.source = function () {
        return new QueryClass({
            type: 'relation-traversal',
            anchor: this.ast,
            direction: 'source',
        });
    };
    QueryClass.prototype.target = function () {
        return new QueryClass({
            type: 'relation-traversal',
            anchor: this.ast,
            direction: 'target',
        });
    };
    QueryClass.prototype.options = function (options) {
        return new QueryClass({
            type: 'options',
            query: this.ast,
            options: options,
        });
    };
    QueryClass.variance = {};
    return QueryClass;
}());
exports.Query = QueryClass;
