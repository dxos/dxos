/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.dxos = (function() {

    /**
     * Namespace dxos.
     * @exports dxos
     * @namespace
     */
    var dxos = {};

    dxos.echo = (function() {

        /**
         * Namespace echo.
         * @memberof dxos
         * @namespace
         */
        var echo = {};

        echo.Value = (function() {

            /**
             * Properties of a Value.
             * @memberof dxos.echo
             * @interface IValue
             * @property {boolean|null} ["null"] Value null
             * @property {boolean|null} [bool] Value bool
             * @property {number|null} [int] Value int
             * @property {number|null} [float] Value float
             * @property {string|null} [string] Value string
             * @property {string|null} [timestamp] Value timestamp
             * @property {string|null} [datetime] Value datetime
             * @property {Uint8Array|null} [bytes] Value bytes
             * @property {dxos.echo.IObject|null} [object] Value object
             */

            /**
             * Constructs a new Value.
             * @memberof dxos.echo
             * @classdesc Represents a Value.
             * @implements IValue
             * @constructor
             * @param {dxos.echo.IValue=} [properties] Properties to set
             */
            function Value(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Value null.
             * @member {boolean} null
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype["null"] = false;

            /**
             * Value bool.
             * @member {boolean} bool
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.bool = false;

            /**
             * Value int.
             * @member {number} int
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.int = 0;

            /**
             * Value float.
             * @member {number} float
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.float = 0;

            /**
             * Value string.
             * @member {string} string
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.string = "";

            /**
             * Value timestamp.
             * @member {string} timestamp
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.timestamp = "";

            /**
             * Value datetime.
             * @member {string} datetime
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.datetime = "";

            /**
             * Value bytes.
             * @member {Uint8Array} bytes
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.bytes = $util.newBuffer([]);

            /**
             * Value object.
             * @member {dxos.echo.IObject|null|undefined} object
             * @memberof dxos.echo.Value
             * @instance
             */
            Value.prototype.object = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * Value Type.
             * @member {"null"|"bool"|"int"|"float"|"string"|"timestamp"|"datetime"|"bytes"|"object"|undefined} Type
             * @memberof dxos.echo.Value
             * @instance
             */
            Object.defineProperty(Value.prototype, "Type", {
                get: $util.oneOfGetter($oneOfFields = ["null", "bool", "int", "float", "string", "timestamp", "datetime", "bytes", "object"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new Value instance using the specified properties.
             * @function create
             * @memberof dxos.echo.Value
             * @static
             * @param {dxos.echo.IValue=} [properties] Properties to set
             * @returns {dxos.echo.Value} Value instance
             */
            Value.create = function create(properties) {
                return new Value(properties);
            };

            /**
             * Encodes the specified Value message. Does not implicitly {@link dxos.echo.Value.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.Value
             * @static
             * @param {dxos.echo.IValue} message Value message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Value.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["null"] != null && Object.hasOwnProperty.call(message, "null"))
                    writer.uint32(/* id 1, wireType 0 =*/8).bool(message["null"]);
                if (message.bool != null && Object.hasOwnProperty.call(message, "bool"))
                    writer.uint32(/* id 2, wireType 0 =*/16).bool(message.bool);
                if (message.int != null && Object.hasOwnProperty.call(message, "int"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.int);
                if (message.float != null && Object.hasOwnProperty.call(message, "float"))
                    writer.uint32(/* id 4, wireType 5 =*/37).float(message.float);
                if (message.string != null && Object.hasOwnProperty.call(message, "string"))
                    writer.uint32(/* id 5, wireType 2 =*/42).string(message.string);
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    writer.uint32(/* id 10, wireType 2 =*/82).string(message.timestamp);
                if (message.datetime != null && Object.hasOwnProperty.call(message, "datetime"))
                    writer.uint32(/* id 11, wireType 2 =*/90).string(message.datetime);
                if (message.bytes != null && Object.hasOwnProperty.call(message, "bytes"))
                    writer.uint32(/* id 12, wireType 2 =*/98).bytes(message.bytes);
                if (message.object != null && Object.hasOwnProperty.call(message, "object"))
                    $root.dxos.echo.Object.encode(message.object, writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Value message, length delimited. Does not implicitly {@link dxos.echo.Value.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.Value
             * @static
             * @param {dxos.echo.IValue} message Value message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Value.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Value message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.Value
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.Value} Value
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Value.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.Value();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message["null"] = reader.bool();
                        break;
                    case 2:
                        message.bool = reader.bool();
                        break;
                    case 3:
                        message.int = reader.int32();
                        break;
                    case 4:
                        message.float = reader.float();
                        break;
                    case 5:
                        message.string = reader.string();
                        break;
                    case 10:
                        message.timestamp = reader.string();
                        break;
                    case 11:
                        message.datetime = reader.string();
                        break;
                    case 12:
                        message.bytes = reader.bytes();
                        break;
                    case 20:
                        message.object = $root.dxos.echo.Object.decode(reader, reader.uint32());
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Value message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.Value
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.Value} Value
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Value.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Value message.
             * @function verify
             * @memberof dxos.echo.Value
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Value.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message["null"] != null && message.hasOwnProperty("null")) {
                    properties.Type = 1;
                    if (typeof message["null"] !== "boolean")
                        return "null: boolean expected";
                }
                if (message.bool != null && message.hasOwnProperty("bool")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (typeof message.bool !== "boolean")
                        return "bool: boolean expected";
                }
                if (message.int != null && message.hasOwnProperty("int")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (!$util.isInteger(message.int))
                        return "int: integer expected";
                }
                if (message.float != null && message.hasOwnProperty("float")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (typeof message.float !== "number")
                        return "float: number expected";
                }
                if (message.string != null && message.hasOwnProperty("string")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (!$util.isString(message.string))
                        return "string: string expected";
                }
                if (message.timestamp != null && message.hasOwnProperty("timestamp")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (!$util.isString(message.timestamp))
                        return "timestamp: string expected";
                }
                if (message.datetime != null && message.hasOwnProperty("datetime")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (!$util.isString(message.datetime))
                        return "datetime: string expected";
                }
                if (message.bytes != null && message.hasOwnProperty("bytes")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    if (!(message.bytes && typeof message.bytes.length === "number" || $util.isString(message.bytes)))
                        return "bytes: buffer expected";
                }
                if (message.object != null && message.hasOwnProperty("object")) {
                    if (properties.Type === 1)
                        return "Type: multiple values";
                    properties.Type = 1;
                    {
                        var error = $root.dxos.echo.Object.verify(message.object);
                        if (error)
                            return "object." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a Value message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.Value
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.Value} Value
             */
            Value.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.Value)
                    return object;
                var message = new $root.dxos.echo.Value();
                if (object["null"] != null)
                    message["null"] = Boolean(object["null"]);
                if (object.bool != null)
                    message.bool = Boolean(object.bool);
                if (object.int != null)
                    message.int = object.int | 0;
                if (object.float != null)
                    message.float = Number(object.float);
                if (object.string != null)
                    message.string = String(object.string);
                if (object.timestamp != null)
                    message.timestamp = String(object.timestamp);
                if (object.datetime != null)
                    message.datetime = String(object.datetime);
                if (object.bytes != null)
                    if (typeof object.bytes === "string")
                        $util.base64.decode(object.bytes, message.bytes = $util.newBuffer($util.base64.length(object.bytes)), 0);
                    else if (object.bytes.length)
                        message.bytes = object.bytes;
                if (object.object != null) {
                    if (typeof object.object !== "object")
                        throw TypeError(".dxos.echo.Value.object: object expected");
                    message.object = $root.dxos.echo.Object.fromObject(object.object);
                }
                return message;
            };

            /**
             * Creates a plain object from a Value message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.Value
             * @static
             * @param {dxos.echo.Value} message Value
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Value.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (message["null"] != null && message.hasOwnProperty("null")) {
                    object["null"] = message["null"];
                    if (options.oneofs)
                        object.Type = "null";
                }
                if (message.bool != null && message.hasOwnProperty("bool")) {
                    object.bool = message.bool;
                    if (options.oneofs)
                        object.Type = "bool";
                }
                if (message.int != null && message.hasOwnProperty("int")) {
                    object.int = message.int;
                    if (options.oneofs)
                        object.Type = "int";
                }
                if (message.float != null && message.hasOwnProperty("float")) {
                    object.float = options.json && !isFinite(message.float) ? String(message.float) : message.float;
                    if (options.oneofs)
                        object.Type = "float";
                }
                if (message.string != null && message.hasOwnProperty("string")) {
                    object.string = message.string;
                    if (options.oneofs)
                        object.Type = "string";
                }
                if (message.timestamp != null && message.hasOwnProperty("timestamp")) {
                    object.timestamp = message.timestamp;
                    if (options.oneofs)
                        object.Type = "timestamp";
                }
                if (message.datetime != null && message.hasOwnProperty("datetime")) {
                    object.datetime = message.datetime;
                    if (options.oneofs)
                        object.Type = "datetime";
                }
                if (message.bytes != null && message.hasOwnProperty("bytes")) {
                    object.bytes = options.bytes === String ? $util.base64.encode(message.bytes, 0, message.bytes.length) : options.bytes === Array ? Array.prototype.slice.call(message.bytes) : message.bytes;
                    if (options.oneofs)
                        object.Type = "bytes";
                }
                if (message.object != null && message.hasOwnProperty("object")) {
                    object.object = $root.dxos.echo.Object.toObject(message.object, options);
                    if (options.oneofs)
                        object.Type = "object";
                }
                return object;
            };

            /**
             * Converts this Value to JSON.
             * @function toJSON
             * @memberof dxos.echo.Value
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Value.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Value;
        })();

        echo.Object = (function() {

            /**
             * Properties of an Object.
             * @memberof dxos.echo
             * @interface IObject
             * @property {Array.<dxos.echo.IKeyValue>|null} [properties] Object properties
             */

            /**
             * Constructs a new Object.
             * @memberof dxos.echo
             * @classdesc Represents an Object.
             * @implements IObject
             * @constructor
             * @param {dxos.echo.IObject=} [properties] Properties to set
             */
            function Object(properties) {
                this.properties = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Object properties.
             * @member {Array.<dxos.echo.IKeyValue>} properties
             * @memberof dxos.echo.Object
             * @instance
             */
            Object.prototype.properties = $util.emptyArray;

            /**
             * Creates a new Object instance using the specified properties.
             * @function create
             * @memberof dxos.echo.Object
             * @static
             * @param {dxos.echo.IObject=} [properties] Properties to set
             * @returns {dxos.echo.Object} Object instance
             */
            Object.create = function create(properties) {
                return new Object(properties);
            };

            /**
             * Encodes the specified Object message. Does not implicitly {@link dxos.echo.Object.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.Object
             * @static
             * @param {dxos.echo.IObject} message Object message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Object.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.properties != null && message.properties.length)
                    for (var i = 0; i < message.properties.length; ++i)
                        $root.dxos.echo.KeyValue.encode(message.properties[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Object message, length delimited. Does not implicitly {@link dxos.echo.Object.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.Object
             * @static
             * @param {dxos.echo.IObject} message Object message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Object.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Object message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.Object
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.Object} Object
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Object.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.Object();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        if (!(message.properties && message.properties.length))
                            message.properties = [];
                        message.properties.push($root.dxos.echo.KeyValue.decode(reader, reader.uint32()));
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Object message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.Object
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.Object} Object
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Object.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Object message.
             * @function verify
             * @memberof dxos.echo.Object
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Object.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.properties != null && message.hasOwnProperty("properties")) {
                    if (!Array.isArray(message.properties))
                        return "properties: array expected";
                    for (var i = 0; i < message.properties.length; ++i) {
                        var error = $root.dxos.echo.KeyValue.verify(message.properties[i]);
                        if (error)
                            return "properties." + error;
                    }
                }
                return null;
            };

            /**
             * Creates an Object message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.Object
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.Object} Object
             */
            Object.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.Object)
                    return object;
                var message = new $root.dxos.echo.Object();
                if (object.properties) {
                    if (!Array.isArray(object.properties))
                        throw TypeError(".dxos.echo.Object.properties: array expected");
                    message.properties = [];
                    for (var i = 0; i < object.properties.length; ++i) {
                        if (typeof object.properties[i] !== "object")
                            throw TypeError(".dxos.echo.Object.properties: object expected");
                        message.properties[i] = $root.dxos.echo.KeyValue.fromObject(object.properties[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from an Object message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.Object
             * @static
             * @param {dxos.echo.Object} message Object
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Object.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.properties = [];
                if (message.properties && message.properties.length) {
                    object.properties = [];
                    for (var j = 0; j < message.properties.length; ++j)
                        object.properties[j] = $root.dxos.echo.KeyValue.toObject(message.properties[j], options);
                }
                return object;
            };

            /**
             * Converts this Object to JSON.
             * @function toJSON
             * @memberof dxos.echo.Object
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Object.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Object;
        })();

        echo.KeyValue = (function() {

            /**
             * Properties of a KeyValue.
             * @memberof dxos.echo
             * @interface IKeyValue
             * @property {string|null} [key] KeyValue key
             * @property {dxos.echo.IValue|null} [value] KeyValue value
             */

            /**
             * Constructs a new KeyValue.
             * @memberof dxos.echo
             * @classdesc Represents a KeyValue.
             * @implements IKeyValue
             * @constructor
             * @param {dxos.echo.IKeyValue=} [properties] Properties to set
             */
            function KeyValue(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * KeyValue key.
             * @member {string} key
             * @memberof dxos.echo.KeyValue
             * @instance
             */
            KeyValue.prototype.key = "";

            /**
             * KeyValue value.
             * @member {dxos.echo.IValue|null|undefined} value
             * @memberof dxos.echo.KeyValue
             * @instance
             */
            KeyValue.prototype.value = null;

            /**
             * Creates a new KeyValue instance using the specified properties.
             * @function create
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {dxos.echo.IKeyValue=} [properties] Properties to set
             * @returns {dxos.echo.KeyValue} KeyValue instance
             */
            KeyValue.create = function create(properties) {
                return new KeyValue(properties);
            };

            /**
             * Encodes the specified KeyValue message. Does not implicitly {@link dxos.echo.KeyValue.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {dxos.echo.IKeyValue} message KeyValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            KeyValue.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.key);
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    $root.dxos.echo.Value.encode(message.value, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified KeyValue message, length delimited. Does not implicitly {@link dxos.echo.KeyValue.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {dxos.echo.IKeyValue} message KeyValue message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            KeyValue.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a KeyValue message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.KeyValue} KeyValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            KeyValue.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.KeyValue();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.key = reader.string();
                        break;
                    case 2:
                        message.value = $root.dxos.echo.Value.decode(reader, reader.uint32());
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a KeyValue message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.KeyValue} KeyValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            KeyValue.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a KeyValue message.
             * @function verify
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            KeyValue.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.key != null && message.hasOwnProperty("key"))
                    if (!$util.isString(message.key))
                        return "key: string expected";
                if (message.value != null && message.hasOwnProperty("value")) {
                    var error = $root.dxos.echo.Value.verify(message.value);
                    if (error)
                        return "value." + error;
                }
                return null;
            };

            /**
             * Creates a KeyValue message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.KeyValue} KeyValue
             */
            KeyValue.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.KeyValue)
                    return object;
                var message = new $root.dxos.echo.KeyValue();
                if (object.key != null)
                    message.key = String(object.key);
                if (object.value != null) {
                    if (typeof object.value !== "object")
                        throw TypeError(".dxos.echo.KeyValue.value: object expected");
                    message.value = $root.dxos.echo.Value.fromObject(object.value);
                }
                return message;
            };

            /**
             * Creates a plain object from a KeyValue message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.KeyValue
             * @static
             * @param {dxos.echo.KeyValue} message KeyValue
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            KeyValue.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.key = "";
                    object.value = null;
                }
                if (message.key != null && message.hasOwnProperty("key"))
                    object.key = message.key;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = $root.dxos.echo.Value.toObject(message.value, options);
                return object;
            };

            /**
             * Converts this KeyValue to JSON.
             * @function toJSON
             * @memberof dxos.echo.KeyValue
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            KeyValue.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return KeyValue;
        })();

        echo.ObjectMutation = (function() {

            /**
             * Properties of an ObjectMutation.
             * @memberof dxos.echo
             * @interface IObjectMutation
             * @property {string|null} [objectId] ObjectMutation objectId
             * @property {string|null} [id] ObjectMutation id
             * @property {string|null} [dependency] ObjectMutation dependency
             * @property {boolean|null} [deleted] ObjectMutation deleted
             * @property {Array.<dxos.echo.ObjectMutation.IMutation>|null} [mutations] ObjectMutation mutations
             */

            /**
             * Constructs a new ObjectMutation.
             * @memberof dxos.echo
             * @classdesc Represents an ObjectMutation.
             * @implements IObjectMutation
             * @constructor
             * @param {dxos.echo.IObjectMutation=} [properties] Properties to set
             */
            function ObjectMutation(properties) {
                this.mutations = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ObjectMutation objectId.
             * @member {string} objectId
             * @memberof dxos.echo.ObjectMutation
             * @instance
             */
            ObjectMutation.prototype.objectId = "";

            /**
             * ObjectMutation id.
             * @member {string} id
             * @memberof dxos.echo.ObjectMutation
             * @instance
             */
            ObjectMutation.prototype.id = "";

            /**
             * ObjectMutation dependency.
             * @member {string} dependency
             * @memberof dxos.echo.ObjectMutation
             * @instance
             */
            ObjectMutation.prototype.dependency = "";

            /**
             * ObjectMutation deleted.
             * @member {boolean} deleted
             * @memberof dxos.echo.ObjectMutation
             * @instance
             */
            ObjectMutation.prototype.deleted = false;

            /**
             * ObjectMutation mutations.
             * @member {Array.<dxos.echo.ObjectMutation.IMutation>} mutations
             * @memberof dxos.echo.ObjectMutation
             * @instance
             */
            ObjectMutation.prototype.mutations = $util.emptyArray;

            /**
             * Creates a new ObjectMutation instance using the specified properties.
             * @function create
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {dxos.echo.IObjectMutation=} [properties] Properties to set
             * @returns {dxos.echo.ObjectMutation} ObjectMutation instance
             */
            ObjectMutation.create = function create(properties) {
                return new ObjectMutation(properties);
            };

            /**
             * Encodes the specified ObjectMutation message. Does not implicitly {@link dxos.echo.ObjectMutation.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {dxos.echo.IObjectMutation} message ObjectMutation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ObjectMutation.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.objectId != null && Object.hasOwnProperty.call(message, "objectId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.objectId);
                if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.id);
                if (message.dependency != null && Object.hasOwnProperty.call(message, "dependency"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.dependency);
                if (message.deleted != null && Object.hasOwnProperty.call(message, "deleted"))
                    writer.uint32(/* id 10, wireType 0 =*/80).bool(message.deleted);
                if (message.mutations != null && message.mutations.length)
                    for (var i = 0; i < message.mutations.length; ++i)
                        $root.dxos.echo.ObjectMutation.Mutation.encode(message.mutations[i], writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ObjectMutation message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutation.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {dxos.echo.IObjectMutation} message ObjectMutation message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ObjectMutation.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an ObjectMutation message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.ObjectMutation} ObjectMutation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ObjectMutation.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.ObjectMutation();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.objectId = reader.string();
                        break;
                    case 2:
                        message.id = reader.string();
                        break;
                    case 3:
                        message.dependency = reader.string();
                        break;
                    case 10:
                        message.deleted = reader.bool();
                        break;
                    case 11:
                        if (!(message.mutations && message.mutations.length))
                            message.mutations = [];
                        message.mutations.push($root.dxos.echo.ObjectMutation.Mutation.decode(reader, reader.uint32()));
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an ObjectMutation message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.ObjectMutation} ObjectMutation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ObjectMutation.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an ObjectMutation message.
             * @function verify
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ObjectMutation.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.objectId != null && message.hasOwnProperty("objectId"))
                    if (!$util.isString(message.objectId))
                        return "objectId: string expected";
                if (message.id != null && message.hasOwnProperty("id"))
                    if (!$util.isString(message.id))
                        return "id: string expected";
                if (message.dependency != null && message.hasOwnProperty("dependency"))
                    if (!$util.isString(message.dependency))
                        return "dependency: string expected";
                if (message.deleted != null && message.hasOwnProperty("deleted"))
                    if (typeof message.deleted !== "boolean")
                        return "deleted: boolean expected";
                if (message.mutations != null && message.hasOwnProperty("mutations")) {
                    if (!Array.isArray(message.mutations))
                        return "mutations: array expected";
                    for (var i = 0; i < message.mutations.length; ++i) {
                        var error = $root.dxos.echo.ObjectMutation.Mutation.verify(message.mutations[i]);
                        if (error)
                            return "mutations." + error;
                    }
                }
                return null;
            };

            /**
             * Creates an ObjectMutation message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.ObjectMutation} ObjectMutation
             */
            ObjectMutation.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.ObjectMutation)
                    return object;
                var message = new $root.dxos.echo.ObjectMutation();
                if (object.objectId != null)
                    message.objectId = String(object.objectId);
                if (object.id != null)
                    message.id = String(object.id);
                if (object.dependency != null)
                    message.dependency = String(object.dependency);
                if (object.deleted != null)
                    message.deleted = Boolean(object.deleted);
                if (object.mutations) {
                    if (!Array.isArray(object.mutations))
                        throw TypeError(".dxos.echo.ObjectMutation.mutations: array expected");
                    message.mutations = [];
                    for (var i = 0; i < object.mutations.length; ++i) {
                        if (typeof object.mutations[i] !== "object")
                            throw TypeError(".dxos.echo.ObjectMutation.mutations: object expected");
                        message.mutations[i] = $root.dxos.echo.ObjectMutation.Mutation.fromObject(object.mutations[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from an ObjectMutation message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.ObjectMutation
             * @static
             * @param {dxos.echo.ObjectMutation} message ObjectMutation
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ObjectMutation.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.mutations = [];
                if (options.defaults) {
                    object.objectId = "";
                    object.id = "";
                    object.dependency = "";
                    object.deleted = false;
                }
                if (message.objectId != null && message.hasOwnProperty("objectId"))
                    object.objectId = message.objectId;
                if (message.id != null && message.hasOwnProperty("id"))
                    object.id = message.id;
                if (message.dependency != null && message.hasOwnProperty("dependency"))
                    object.dependency = message.dependency;
                if (message.deleted != null && message.hasOwnProperty("deleted"))
                    object.deleted = message.deleted;
                if (message.mutations && message.mutations.length) {
                    object.mutations = [];
                    for (var j = 0; j < message.mutations.length; ++j)
                        object.mutations[j] = $root.dxos.echo.ObjectMutation.Mutation.toObject(message.mutations[j], options);
                }
                return object;
            };

            /**
             * Converts this ObjectMutation to JSON.
             * @function toJSON
             * @memberof dxos.echo.ObjectMutation
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ObjectMutation.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Operation enum.
             * @name dxos.echo.ObjectMutation.Operation
             * @enum {number}
             * @property {number} SET=0 SET value
             * @property {number} DELETE=1 DELETE value
             * @property {number} ARRAY_PUSH=2 ARRAY_PUSH value
             * @property {number} SET_ADD=3 SET_ADD value
             * @property {number} SET_DELETE=4 SET_DELETE value
             */
            ObjectMutation.Operation = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SET"] = 0;
                values[valuesById[1] = "DELETE"] = 1;
                values[valuesById[2] = "ARRAY_PUSH"] = 2;
                values[valuesById[3] = "SET_ADD"] = 3;
                values[valuesById[4] = "SET_DELETE"] = 4;
                return values;
            })();

            ObjectMutation.Mutation = (function() {

                /**
                 * Properties of a Mutation.
                 * @memberof dxos.echo.ObjectMutation
                 * @interface IMutation
                 * @property {dxos.echo.ObjectMutation.Operation|null} [operation] Mutation operation
                 * @property {string|null} [key] Mutation key
                 * @property {dxos.echo.IValue|null} [value] Mutation value
                 */

                /**
                 * Constructs a new Mutation.
                 * @memberof dxos.echo.ObjectMutation
                 * @classdesc Represents a Mutation.
                 * @implements IMutation
                 * @constructor
                 * @param {dxos.echo.ObjectMutation.IMutation=} [properties] Properties to set
                 */
                function Mutation(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Mutation operation.
                 * @member {dxos.echo.ObjectMutation.Operation} operation
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @instance
                 */
                Mutation.prototype.operation = 0;

                /**
                 * Mutation key.
                 * @member {string} key
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @instance
                 */
                Mutation.prototype.key = "";

                /**
                 * Mutation value.
                 * @member {dxos.echo.IValue|null|undefined} value
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @instance
                 */
                Mutation.prototype.value = null;

                /**
                 * Creates a new Mutation instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {dxos.echo.ObjectMutation.IMutation=} [properties] Properties to set
                 * @returns {dxos.echo.ObjectMutation.Mutation} Mutation instance
                 */
                Mutation.create = function create(properties) {
                    return new Mutation(properties);
                };

                /**
                 * Encodes the specified Mutation message. Does not implicitly {@link dxos.echo.ObjectMutation.Mutation.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {dxos.echo.ObjectMutation.IMutation} message Mutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Mutation.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.operation != null && Object.hasOwnProperty.call(message, "operation"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.operation);
                    if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.key);
                    if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                        $root.dxos.echo.Value.encode(message.value, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Mutation message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutation.Mutation.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {dxos.echo.ObjectMutation.IMutation} message Mutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Mutation.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Mutation message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.ObjectMutation.Mutation} Mutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Mutation.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.ObjectMutation.Mutation();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.operation = reader.int32();
                            break;
                        case 2:
                            message.key = reader.string();
                            break;
                        case 3:
                            message.value = $root.dxos.echo.Value.decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Mutation message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.ObjectMutation.Mutation} Mutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Mutation.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Mutation message.
                 * @function verify
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Mutation.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.operation != null && message.hasOwnProperty("operation"))
                        switch (message.operation) {
                        default:
                            return "operation: enum value expected";
                        case 0:
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            break;
                        }
                    if (message.key != null && message.hasOwnProperty("key"))
                        if (!$util.isString(message.key))
                            return "key: string expected";
                    if (message.value != null && message.hasOwnProperty("value")) {
                        var error = $root.dxos.echo.Value.verify(message.value);
                        if (error)
                            return "value." + error;
                    }
                    return null;
                };

                /**
                 * Creates a Mutation message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.ObjectMutation.Mutation} Mutation
                 */
                Mutation.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.ObjectMutation.Mutation)
                        return object;
                    var message = new $root.dxos.echo.ObjectMutation.Mutation();
                    switch (object.operation) {
                    case "SET":
                    case 0:
                        message.operation = 0;
                        break;
                    case "DELETE":
                    case 1:
                        message.operation = 1;
                        break;
                    case "ARRAY_PUSH":
                    case 2:
                        message.operation = 2;
                        break;
                    case "SET_ADD":
                    case 3:
                        message.operation = 3;
                        break;
                    case "SET_DELETE":
                    case 4:
                        message.operation = 4;
                        break;
                    }
                    if (object.key != null)
                        message.key = String(object.key);
                    if (object.value != null) {
                        if (typeof object.value !== "object")
                            throw TypeError(".dxos.echo.ObjectMutation.Mutation.value: object expected");
                        message.value = $root.dxos.echo.Value.fromObject(object.value);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a Mutation message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @static
                 * @param {dxos.echo.ObjectMutation.Mutation} message Mutation
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Mutation.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.operation = options.enums === String ? "SET" : 0;
                        object.key = "";
                        object.value = null;
                    }
                    if (message.operation != null && message.hasOwnProperty("operation"))
                        object.operation = options.enums === String ? $root.dxos.echo.ObjectMutation.Operation[message.operation] : message.operation;
                    if (message.key != null && message.hasOwnProperty("key"))
                        object.key = message.key;
                    if (message.value != null && message.hasOwnProperty("value"))
                        object.value = $root.dxos.echo.Value.toObject(message.value, options);
                    return object;
                };

                /**
                 * Converts this Mutation to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.ObjectMutation.Mutation
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Mutation.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Mutation;
            })();

            return ObjectMutation;
        })();

        echo.ObjectMutationSet = (function() {

            /**
             * Properties of an ObjectMutationSet.
             * @memberof dxos.echo
             * @interface IObjectMutationSet
             * @property {Array.<dxos.echo.IObjectMutation>|null} [mutations] ObjectMutationSet mutations
             */

            /**
             * Constructs a new ObjectMutationSet.
             * @memberof dxos.echo
             * @classdesc Represents an ObjectMutationSet.
             * @implements IObjectMutationSet
             * @constructor
             * @param {dxos.echo.IObjectMutationSet=} [properties] Properties to set
             */
            function ObjectMutationSet(properties) {
                this.mutations = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ObjectMutationSet mutations.
             * @member {Array.<dxos.echo.IObjectMutation>} mutations
             * @memberof dxos.echo.ObjectMutationSet
             * @instance
             */
            ObjectMutationSet.prototype.mutations = $util.emptyArray;

            /**
             * Creates a new ObjectMutationSet instance using the specified properties.
             * @function create
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {dxos.echo.IObjectMutationSet=} [properties] Properties to set
             * @returns {dxos.echo.ObjectMutationSet} ObjectMutationSet instance
             */
            ObjectMutationSet.create = function create(properties) {
                return new ObjectMutationSet(properties);
            };

            /**
             * Encodes the specified ObjectMutationSet message. Does not implicitly {@link dxos.echo.ObjectMutationSet.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {dxos.echo.IObjectMutationSet} message ObjectMutationSet message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ObjectMutationSet.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.mutations != null && message.mutations.length)
                    for (var i = 0; i < message.mutations.length; ++i)
                        $root.dxos.echo.ObjectMutation.encode(message.mutations[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ObjectMutationSet message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutationSet.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {dxos.echo.IObjectMutationSet} message ObjectMutationSet message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ObjectMutationSet.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an ObjectMutationSet message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.ObjectMutationSet} ObjectMutationSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ObjectMutationSet.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.ObjectMutationSet();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        if (!(message.mutations && message.mutations.length))
                            message.mutations = [];
                        message.mutations.push($root.dxos.echo.ObjectMutation.decode(reader, reader.uint32()));
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an ObjectMutationSet message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.ObjectMutationSet} ObjectMutationSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ObjectMutationSet.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an ObjectMutationSet message.
             * @function verify
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ObjectMutationSet.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.mutations != null && message.hasOwnProperty("mutations")) {
                    if (!Array.isArray(message.mutations))
                        return "mutations: array expected";
                    for (var i = 0; i < message.mutations.length; ++i) {
                        var error = $root.dxos.echo.ObjectMutation.verify(message.mutations[i]);
                        if (error)
                            return "mutations." + error;
                    }
                }
                return null;
            };

            /**
             * Creates an ObjectMutationSet message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.ObjectMutationSet} ObjectMutationSet
             */
            ObjectMutationSet.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.ObjectMutationSet)
                    return object;
                var message = new $root.dxos.echo.ObjectMutationSet();
                if (object.mutations) {
                    if (!Array.isArray(object.mutations))
                        throw TypeError(".dxos.echo.ObjectMutationSet.mutations: array expected");
                    message.mutations = [];
                    for (var i = 0; i < object.mutations.length; ++i) {
                        if (typeof object.mutations[i] !== "object")
                            throw TypeError(".dxos.echo.ObjectMutationSet.mutations: object expected");
                        message.mutations[i] = $root.dxos.echo.ObjectMutation.fromObject(object.mutations[i]);
                    }
                }
                return message;
            };

            /**
             * Creates a plain object from an ObjectMutationSet message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.ObjectMutationSet
             * @static
             * @param {dxos.echo.ObjectMutationSet} message ObjectMutationSet
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ObjectMutationSet.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.arrays || options.defaults)
                    object.mutations = [];
                if (message.mutations && message.mutations.length) {
                    object.mutations = [];
                    for (var j = 0; j < message.mutations.length; ++j)
                        object.mutations[j] = $root.dxos.echo.ObjectMutation.toObject(message.mutations[j], options);
                }
                return object;
            };

            /**
             * Converts this ObjectMutationSet to JSON.
             * @function toJSON
             * @memberof dxos.echo.ObjectMutationSet
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ObjectMutationSet.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ObjectMutationSet;
        })();

        echo.Envelope = (function() {

            /**
             * Properties of an Envelope.
             * @memberof dxos.echo
             * @interface IEnvelope
             * @property {google.protobuf.IAny|null} [message] Envelope message
             */

            /**
             * Constructs a new Envelope.
             * @memberof dxos.echo
             * @classdesc Represents an Envelope.
             * @implements IEnvelope
             * @constructor
             * @param {dxos.echo.IEnvelope=} [properties] Properties to set
             */
            function Envelope(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Envelope message.
             * @member {google.protobuf.IAny|null|undefined} message
             * @memberof dxos.echo.Envelope
             * @instance
             */
            Envelope.prototype.message = null;

            /**
             * Creates a new Envelope instance using the specified properties.
             * @function create
             * @memberof dxos.echo.Envelope
             * @static
             * @param {dxos.echo.IEnvelope=} [properties] Properties to set
             * @returns {dxos.echo.Envelope} Envelope instance
             */
            Envelope.create = function create(properties) {
                return new Envelope(properties);
            };

            /**
             * Encodes the specified Envelope message. Does not implicitly {@link dxos.echo.Envelope.verify|verify} messages.
             * @function encode
             * @memberof dxos.echo.Envelope
             * @static
             * @param {dxos.echo.IEnvelope} message Envelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Envelope.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                    $root.google.protobuf.Any.encode(message.message, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Envelope message, length delimited. Does not implicitly {@link dxos.echo.Envelope.verify|verify} messages.
             * @function encodeDelimited
             * @memberof dxos.echo.Envelope
             * @static
             * @param {dxos.echo.IEnvelope} message Envelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Envelope.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @function decode
             * @memberof dxos.echo.Envelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {dxos.echo.Envelope} Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Envelope.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.Envelope();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.message = $root.google.protobuf.Any.decode(reader, reader.uint32());
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Envelope message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof dxos.echo.Envelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {dxos.echo.Envelope} Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Envelope.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Envelope message.
             * @function verify
             * @memberof dxos.echo.Envelope
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Envelope.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.message != null && message.hasOwnProperty("message")) {
                    var error = $root.google.protobuf.Any.verify(message.message);
                    if (error)
                        return "message." + error;
                }
                return null;
            };

            /**
             * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof dxos.echo.Envelope
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {dxos.echo.Envelope} Envelope
             */
            Envelope.fromObject = function fromObject(object) {
                if (object instanceof $root.dxos.echo.Envelope)
                    return object;
                var message = new $root.dxos.echo.Envelope();
                if (object.message != null) {
                    if (typeof object.message !== "object")
                        throw TypeError(".dxos.echo.Envelope.message: object expected");
                    message.message = $root.google.protobuf.Any.fromObject(object.message);
                }
                return message;
            };

            /**
             * Creates a plain object from an Envelope message. Also converts values to other types if specified.
             * @function toObject
             * @memberof dxos.echo.Envelope
             * @static
             * @param {dxos.echo.Envelope} message Envelope
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Envelope.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.message = null;
                if (message.message != null && message.hasOwnProperty("message"))
                    object.message = $root.google.protobuf.Any.toObject(message.message, options);
                return object;
            };

            /**
             * Converts this Envelope to JSON.
             * @function toJSON
             * @memberof dxos.echo.Envelope
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Envelope.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Envelope;
        })();

        return echo;
    })();

    return dxos;
})();

$root.google = (function() {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    var google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        var protobuf = {};

        protobuf.Any = (function() {

            /**
             * Properties of an Any.
             * @memberof google.protobuf
             * @interface IAny
             * @property {string|null} [type_url] Any type_url
             * @property {Uint8Array|null} [value] Any value
             */

            /**
             * Constructs a new Any.
             * @memberof google.protobuf
             * @classdesc Represents an Any.
             * @implements IAny
             * @constructor
             * @param {google.protobuf.IAny=} [properties] Properties to set
             */
            function Any(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Any type_url.
             * @member {string} type_url
             * @memberof google.protobuf.Any
             * @instance
             */
            Any.prototype.type_url = "";

            /**
             * Any value.
             * @member {Uint8Array} value
             * @memberof google.protobuf.Any
             * @instance
             */
            Any.prototype.value = $util.newBuffer([]);

            /**
             * Creates a new Any instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny=} [properties] Properties to set
             * @returns {google.protobuf.Any} Any instance
             */
            Any.create = function create(properties) {
                return new Any(properties);
            };

            /**
             * Encodes the specified Any message. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny} message Any message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Any.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.type_url != null && Object.hasOwnProperty.call(message, "type_url"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.type_url);
                if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.value);
                return writer;
            };

            /**
             * Encodes the specified Any message, length delimited. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.IAny} message Any message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Any.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Any message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Any
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Any} Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Any.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Any();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1:
                        message.type_url = reader.string();
                        break;
                    case 2:
                        message.value = reader.bytes();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Any message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Any
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Any} Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Any.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Any message.
             * @function verify
             * @memberof google.protobuf.Any
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Any.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.type_url != null && message.hasOwnProperty("type_url"))
                    if (!$util.isString(message.type_url))
                        return "type_url: string expected";
                if (message.value != null && message.hasOwnProperty("value"))
                    if (!(message.value && typeof message.value.length === "number" || $util.isString(message.value)))
                        return "value: buffer expected";
                return null;
            };

            /**
             * Creates an Any message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Any
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Any} Any
             */
            Any.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Any)
                    return object;
                var message = new $root.google.protobuf.Any();
                if (object.type_url != null)
                    message.type_url = String(object.type_url);
                if (object.value != null)
                    if (typeof object.value === "string")
                        $util.base64.decode(object.value, message.value = $util.newBuffer($util.base64.length(object.value)), 0);
                    else if (object.value.length)
                        message.value = object.value;
                return message;
            };

            /**
             * Creates a plain object from an Any message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Any
             * @static
             * @param {google.protobuf.Any} message Any
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Any.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.type_url = "";
                    if (options.bytes === String)
                        object.value = "";
                    else {
                        object.value = [];
                        if (options.bytes !== Array)
                            object.value = $util.newBuffer(object.value);
                    }
                }
                if (message.type_url != null && message.hasOwnProperty("type_url"))
                    object.type_url = message.type_url;
                if (message.value != null && message.hasOwnProperty("value"))
                    object.value = options.bytes === String ? $util.base64.encode(message.value, 0, message.value.length) : options.bytes === Array ? Array.prototype.slice.call(message.value) : message.value;
                return object;
            };

            /**
             * Converts this Any to JSON.
             * @function toJSON
             * @memberof google.protobuf.Any
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Any.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return Any;
        })();

        return protobuf;
    })();

    return google;
})();

module.exports = $root;
