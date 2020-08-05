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

        echo.testing = (function() {

            /**
             * Namespace testing.
             * @memberof dxos.echo
             * @namespace
             */
            var testing = {};

            testing.Envelope = (function() {

                /**
                 * Properties of an Envelope.
                 * @memberof dxos.echo.testing
                 * @interface IEnvelope
                 * @property {google.protobuf.IAny|null} [message] Envelope message
                 */

                /**
                 * Constructs a new Envelope.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents an Envelope.
                 * @implements IEnvelope
                 * @constructor
                 * @param {dxos.echo.testing.IEnvelope=} [properties] Properties to set
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
                 * @memberof dxos.echo.testing.Envelope
                 * @instance
                 */
                Envelope.prototype.message = null;

                /**
                 * Creates a new Envelope instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {dxos.echo.testing.IEnvelope=} [properties] Properties to set
                 * @returns {dxos.echo.testing.Envelope} Envelope instance
                 */
                Envelope.create = function create(properties) {
                    return new Envelope(properties);
                };

                /**
                 * Encodes the specified Envelope message. Does not implicitly {@link dxos.echo.testing.Envelope.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {dxos.echo.testing.IEnvelope} message Envelope message or plain object to encode
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
                 * Encodes the specified Envelope message, length delimited. Does not implicitly {@link dxos.echo.testing.Envelope.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {dxos.echo.testing.IEnvelope} message Envelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Envelope.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an Envelope message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.Envelope} Envelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Envelope.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.Envelope();
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
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.Envelope} Envelope
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
                 * @memberof dxos.echo.testing.Envelope
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
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.Envelope} Envelope
                 */
                Envelope.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.Envelope)
                        return object;
                    var message = new $root.dxos.echo.testing.Envelope();
                    if (object.message != null) {
                        if (typeof object.message !== "object")
                            throw TypeError(".dxos.echo.testing.Envelope.message: object expected");
                        message.message = $root.google.protobuf.Any.fromObject(object.message);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from an Envelope message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.Envelope
                 * @static
                 * @param {dxos.echo.testing.Envelope} message Envelope
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
                 * @memberof dxos.echo.testing.Envelope
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Envelope.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Envelope;
            })();

            testing.TestAdmit = (function() {

                /**
                 * Properties of a TestAdmit.
                 * @memberof dxos.echo.testing
                 * @interface ITestAdmit
                 * @property {string|null} [feedKey] TestAdmit feedKey
                 */

                /**
                 * Constructs a new TestAdmit.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a TestAdmit.
                 * @implements ITestAdmit
                 * @constructor
                 * @param {dxos.echo.testing.ITestAdmit=} [properties] Properties to set
                 */
                function TestAdmit(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * TestAdmit feedKey.
                 * @member {string} feedKey
                 * @memberof dxos.echo.testing.TestAdmit
                 * @instance
                 */
                TestAdmit.prototype.feedKey = "";

                /**
                 * Creates a new TestAdmit instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {dxos.echo.testing.ITestAdmit=} [properties] Properties to set
                 * @returns {dxos.echo.testing.TestAdmit} TestAdmit instance
                 */
                TestAdmit.create = function create(properties) {
                    return new TestAdmit(properties);
                };

                /**
                 * Encodes the specified TestAdmit message. Does not implicitly {@link dxos.echo.testing.TestAdmit.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {dxos.echo.testing.ITestAdmit} message TestAdmit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestAdmit.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.feedKey != null && Object.hasOwnProperty.call(message, "feedKey"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.feedKey);
                    return writer;
                };

                /**
                 * Encodes the specified TestAdmit message, length delimited. Does not implicitly {@link dxos.echo.testing.TestAdmit.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {dxos.echo.testing.ITestAdmit} message TestAdmit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestAdmit.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TestAdmit message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.TestAdmit} TestAdmit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestAdmit.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.TestAdmit();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.feedKey = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TestAdmit message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.TestAdmit} TestAdmit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestAdmit.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TestAdmit message.
                 * @function verify
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TestAdmit.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        if (!$util.isString(message.feedKey))
                            return "feedKey: string expected";
                    return null;
                };

                /**
                 * Creates a TestAdmit message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.TestAdmit} TestAdmit
                 */
                TestAdmit.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.TestAdmit)
                        return object;
                    var message = new $root.dxos.echo.testing.TestAdmit();
                    if (object.feedKey != null)
                        message.feedKey = String(object.feedKey);
                    return message;
                };

                /**
                 * Creates a plain object from a TestAdmit message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.TestAdmit
                 * @static
                 * @param {dxos.echo.testing.TestAdmit} message TestAdmit
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TestAdmit.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.feedKey = "";
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        object.feedKey = message.feedKey;
                    return object;
                };

                /**
                 * Converts this TestAdmit to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.TestAdmit
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TestAdmit.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TestAdmit;
            })();

            testing.TestItemGenesis = (function() {

                /**
                 * Properties of a TestItemGenesis.
                 * @memberof dxos.echo.testing
                 * @interface ITestItemGenesis
                 * @property {string|null} [itemId] TestItemGenesis itemId
                 * @property {string|null} [model] TestItemGenesis model
                 */

                /**
                 * Constructs a new TestItemGenesis.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a TestItemGenesis.
                 * @implements ITestItemGenesis
                 * @constructor
                 * @param {dxos.echo.testing.ITestItemGenesis=} [properties] Properties to set
                 */
                function TestItemGenesis(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * TestItemGenesis itemId.
                 * @member {string} itemId
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @instance
                 */
                TestItemGenesis.prototype.itemId = "";

                /**
                 * TestItemGenesis model.
                 * @member {string} model
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @instance
                 */
                TestItemGenesis.prototype.model = "";

                /**
                 * Creates a new TestItemGenesis instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {dxos.echo.testing.ITestItemGenesis=} [properties] Properties to set
                 * @returns {dxos.echo.testing.TestItemGenesis} TestItemGenesis instance
                 */
                TestItemGenesis.create = function create(properties) {
                    return new TestItemGenesis(properties);
                };

                /**
                 * Encodes the specified TestItemGenesis message. Does not implicitly {@link dxos.echo.testing.TestItemGenesis.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {dxos.echo.testing.ITestItemGenesis} message TestItemGenesis message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestItemGenesis.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.itemId != null && Object.hasOwnProperty.call(message, "itemId"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.itemId);
                    if (message.model != null && Object.hasOwnProperty.call(message, "model"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.model);
                    return writer;
                };

                /**
                 * Encodes the specified TestItemGenesis message, length delimited. Does not implicitly {@link dxos.echo.testing.TestItemGenesis.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {dxos.echo.testing.ITestItemGenesis} message TestItemGenesis message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestItemGenesis.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TestItemGenesis message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.TestItemGenesis} TestItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestItemGenesis.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.TestItemGenesis();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.itemId = reader.string();
                            break;
                        case 2:
                            message.model = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TestItemGenesis message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.TestItemGenesis} TestItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestItemGenesis.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TestItemGenesis message.
                 * @function verify
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TestItemGenesis.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        if (!$util.isString(message.itemId))
                            return "itemId: string expected";
                    if (message.model != null && message.hasOwnProperty("model"))
                        if (!$util.isString(message.model))
                            return "model: string expected";
                    return null;
                };

                /**
                 * Creates a TestItemGenesis message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.TestItemGenesis} TestItemGenesis
                 */
                TestItemGenesis.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.TestItemGenesis)
                        return object;
                    var message = new $root.dxos.echo.testing.TestItemGenesis();
                    if (object.itemId != null)
                        message.itemId = String(object.itemId);
                    if (object.model != null)
                        message.model = String(object.model);
                    return message;
                };

                /**
                 * Creates a plain object from a TestItemGenesis message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @static
                 * @param {dxos.echo.testing.TestItemGenesis} message TestItemGenesis
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TestItemGenesis.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.itemId = "";
                        object.model = "";
                    }
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        object.itemId = message.itemId;
                    if (message.model != null && message.hasOwnProperty("model"))
                        object.model = message.model;
                    return object;
                };

                /**
                 * Converts this TestItemGenesis to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.TestItemGenesis
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TestItemGenesis.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TestItemGenesis;
            })();

            testing.TestItemMutation = (function() {

                /**
                 * Properties of a TestItemMutation.
                 * @memberof dxos.echo.testing
                 * @interface ITestItemMutation
                 * @property {string|null} [itemId] TestItemMutation itemId
                 * @property {number|null} [seq] TestItemMutation seq
                 * @property {string|null} [id] TestItemMutation id
                 * @property {string|null} [depends] TestItemMutation depends
                 * @property {string|null} [tag] TestItemMutation tag
                 * @property {string|null} [key] TestItemMutation key
                 * @property {string|null} [value] TestItemMutation value
                 * @property {google.protobuf.IAny|null} [payload] TestItemMutation payload
                 */

                /**
                 * Constructs a new TestItemMutation.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a TestItemMutation.
                 * @implements ITestItemMutation
                 * @constructor
                 * @param {dxos.echo.testing.ITestItemMutation=} [properties] Properties to set
                 */
                function TestItemMutation(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * TestItemMutation itemId.
                 * @member {string} itemId
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.itemId = "";

                /**
                 * TestItemMutation seq.
                 * @member {number} seq
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.seq = 0;

                /**
                 * TestItemMutation id.
                 * @member {string} id
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.id = "";

                /**
                 * TestItemMutation depends.
                 * @member {string} depends
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.depends = "";

                /**
                 * TestItemMutation tag.
                 * @member {string} tag
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.tag = "";

                /**
                 * TestItemMutation key.
                 * @member {string} key
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.key = "";

                /**
                 * TestItemMutation value.
                 * @member {string} value
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.value = "";

                /**
                 * TestItemMutation payload.
                 * @member {google.protobuf.IAny|null|undefined} payload
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 */
                TestItemMutation.prototype.payload = null;

                /**
                 * Creates a new TestItemMutation instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {dxos.echo.testing.ITestItemMutation=} [properties] Properties to set
                 * @returns {dxos.echo.testing.TestItemMutation} TestItemMutation instance
                 */
                TestItemMutation.create = function create(properties) {
                    return new TestItemMutation(properties);
                };

                /**
                 * Encodes the specified TestItemMutation message. Does not implicitly {@link dxos.echo.testing.TestItemMutation.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {dxos.echo.testing.ITestItemMutation} message TestItemMutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestItemMutation.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.itemId != null && Object.hasOwnProperty.call(message, "itemId"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.itemId);
                    if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.seq);
                    if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.id);
                    if (message.depends != null && Object.hasOwnProperty.call(message, "depends"))
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.depends);
                    if (message.tag != null && Object.hasOwnProperty.call(message, "tag"))
                        writer.uint32(/* id 5, wireType 2 =*/42).string(message.tag);
                    if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.key);
                    if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                        writer.uint32(/* id 7, wireType 2 =*/58).string(message.value);
                    if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                        $root.google.protobuf.Any.encode(message.payload, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified TestItemMutation message, length delimited. Does not implicitly {@link dxos.echo.testing.TestItemMutation.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {dxos.echo.testing.ITestItemMutation} message TestItemMutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestItemMutation.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TestItemMutation message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.TestItemMutation} TestItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestItemMutation.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.TestItemMutation();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.itemId = reader.string();
                            break;
                        case 2:
                            message.seq = reader.int32();
                            break;
                        case 3:
                            message.id = reader.string();
                            break;
                        case 4:
                            message.depends = reader.string();
                            break;
                        case 5:
                            message.tag = reader.string();
                            break;
                        case 6:
                            message.key = reader.string();
                            break;
                        case 7:
                            message.value = reader.string();
                            break;
                        case 8:
                            message.payload = $root.google.protobuf.Any.decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TestItemMutation message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.TestItemMutation} TestItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestItemMutation.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TestItemMutation message.
                 * @function verify
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TestItemMutation.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        if (!$util.isString(message.itemId))
                            return "itemId: string expected";
                    if (message.seq != null && message.hasOwnProperty("seq"))
                        if (!$util.isInteger(message.seq))
                            return "seq: integer expected";
                    if (message.id != null && message.hasOwnProperty("id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.depends != null && message.hasOwnProperty("depends"))
                        if (!$util.isString(message.depends))
                            return "depends: string expected";
                    if (message.tag != null && message.hasOwnProperty("tag"))
                        if (!$util.isString(message.tag))
                            return "tag: string expected";
                    if (message.key != null && message.hasOwnProperty("key"))
                        if (!$util.isString(message.key))
                            return "key: string expected";
                    if (message.value != null && message.hasOwnProperty("value"))
                        if (!$util.isString(message.value))
                            return "value: string expected";
                    if (message.payload != null && message.hasOwnProperty("payload")) {
                        var error = $root.google.protobuf.Any.verify(message.payload);
                        if (error)
                            return "payload." + error;
                    }
                    return null;
                };

                /**
                 * Creates a TestItemMutation message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.TestItemMutation} TestItemMutation
                 */
                TestItemMutation.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.TestItemMutation)
                        return object;
                    var message = new $root.dxos.echo.testing.TestItemMutation();
                    if (object.itemId != null)
                        message.itemId = String(object.itemId);
                    if (object.seq != null)
                        message.seq = object.seq | 0;
                    if (object.id != null)
                        message.id = String(object.id);
                    if (object.depends != null)
                        message.depends = String(object.depends);
                    if (object.tag != null)
                        message.tag = String(object.tag);
                    if (object.key != null)
                        message.key = String(object.key);
                    if (object.value != null)
                        message.value = String(object.value);
                    if (object.payload != null) {
                        if (typeof object.payload !== "object")
                            throw TypeError(".dxos.echo.testing.TestItemMutation.payload: object expected");
                        message.payload = $root.google.protobuf.Any.fromObject(object.payload);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a TestItemMutation message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @static
                 * @param {dxos.echo.testing.TestItemMutation} message TestItemMutation
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TestItemMutation.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.itemId = "";
                        object.seq = 0;
                        object.id = "";
                        object.depends = "";
                        object.tag = "";
                        object.key = "";
                        object.value = "";
                        object.payload = null;
                    }
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        object.itemId = message.itemId;
                    if (message.seq != null && message.hasOwnProperty("seq"))
                        object.seq = message.seq;
                    if (message.id != null && message.hasOwnProperty("id"))
                        object.id = message.id;
                    if (message.depends != null && message.hasOwnProperty("depends"))
                        object.depends = message.depends;
                    if (message.tag != null && message.hasOwnProperty("tag"))
                        object.tag = message.tag;
                    if (message.key != null && message.hasOwnProperty("key"))
                        object.key = message.key;
                    if (message.value != null && message.hasOwnProperty("value"))
                        object.value = message.value;
                    if (message.payload != null && message.hasOwnProperty("payload"))
                        object.payload = $root.google.protobuf.Any.toObject(message.payload, options);
                    return object;
                };

                /**
                 * Converts this TestItemMutation to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.TestItemMutation
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TestItemMutation.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TestItemMutation;
            })();

            return testing;
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
