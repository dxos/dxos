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

            testing.FeedMessage = (function() {

                /**
                 * Properties of a FeedMessage.
                 * @memberof dxos.echo.testing
                 * @interface IFeedMessage
                 * @property {Uint8Array|null} [feedKey] FeedMessage feedKey
                 * @property {dxos.echo.testing.IEnvelope|null} [data] FeedMessage data
                 */

                /**
                 * Constructs a new FeedMessage.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a FeedMessage.
                 * @implements IFeedMessage
                 * @constructor
                 * @param {dxos.echo.testing.IFeedMessage=} [properties] Properties to set
                 */
                function FeedMessage(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * FeedMessage feedKey.
                 * @member {Uint8Array} feedKey
                 * @memberof dxos.echo.testing.FeedMessage
                 * @instance
                 */
                FeedMessage.prototype.feedKey = $util.newBuffer([]);

                /**
                 * FeedMessage data.
                 * @member {dxos.echo.testing.IEnvelope|null|undefined} data
                 * @memberof dxos.echo.testing.FeedMessage
                 * @instance
                 */
                FeedMessage.prototype.data = null;

                /**
                 * Creates a new FeedMessage instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {dxos.echo.testing.IFeedMessage=} [properties] Properties to set
                 * @returns {dxos.echo.testing.FeedMessage} FeedMessage instance
                 */
                FeedMessage.create = function create(properties) {
                    return new FeedMessage(properties);
                };

                /**
                 * Encodes the specified FeedMessage message. Does not implicitly {@link dxos.echo.testing.FeedMessage.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {dxos.echo.testing.IFeedMessage} message FeedMessage message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                FeedMessage.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.feedKey != null && Object.hasOwnProperty.call(message, "feedKey"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.feedKey);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        $root.dxos.echo.testing.Envelope.encode(message.data, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified FeedMessage message, length delimited. Does not implicitly {@link dxos.echo.testing.FeedMessage.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {dxos.echo.testing.IFeedMessage} message FeedMessage message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                FeedMessage.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a FeedMessage message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.FeedMessage} FeedMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                FeedMessage.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.FeedMessage();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.feedKey = reader.bytes();
                            break;
                        case 2:
                            message.data = $root.dxos.echo.testing.Envelope.decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a FeedMessage message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.FeedMessage} FeedMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                FeedMessage.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a FeedMessage message.
                 * @function verify
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                FeedMessage.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        if (!(message.feedKey && typeof message.feedKey.length === "number" || $util.isString(message.feedKey)))
                            return "feedKey: buffer expected";
                    if (message.data != null && message.hasOwnProperty("data")) {
                        var error = $root.dxos.echo.testing.Envelope.verify(message.data);
                        if (error)
                            return "data." + error;
                    }
                    return null;
                };

                /**
                 * Creates a FeedMessage message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.FeedMessage} FeedMessage
                 */
                FeedMessage.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.FeedMessage)
                        return object;
                    var message = new $root.dxos.echo.testing.FeedMessage();
                    if (object.feedKey != null)
                        if (typeof object.feedKey === "string")
                            $util.base64.decode(object.feedKey, message.feedKey = $util.newBuffer($util.base64.length(object.feedKey)), 0);
                        else if (object.feedKey.length)
                            message.feedKey = object.feedKey;
                    if (object.data != null) {
                        if (typeof object.data !== "object")
                            throw TypeError(".dxos.echo.testing.FeedMessage.data: object expected");
                        message.data = $root.dxos.echo.testing.Envelope.fromObject(object.data);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a FeedMessage message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.FeedMessage
                 * @static
                 * @param {dxos.echo.testing.FeedMessage} message FeedMessage
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                FeedMessage.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        if (options.bytes === String)
                            object.feedKey = "";
                        else {
                            object.feedKey = [];
                            if (options.bytes !== Array)
                                object.feedKey = $util.newBuffer(object.feedKey);
                        }
                        object.data = null;
                    }
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        object.feedKey = options.bytes === String ? $util.base64.encode(message.feedKey, 0, message.feedKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.feedKey) : message.feedKey;
                    if (message.data != null && message.hasOwnProperty("data"))
                        object.data = $root.dxos.echo.testing.Envelope.toObject(message.data, options);
                    return object;
                };

                /**
                 * Converts this FeedMessage to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.FeedMessage
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                FeedMessage.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return FeedMessage;
            })();

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

            testing.Admit = (function() {

                /**
                 * Properties of an Admit.
                 * @memberof dxos.echo.testing
                 * @interface IAdmit
                 * @property {Uint8Array|null} [feedKey] Admit feedKey
                 */

                /**
                 * Constructs a new Admit.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents an Admit.
                 * @implements IAdmit
                 * @constructor
                 * @param {dxos.echo.testing.IAdmit=} [properties] Properties to set
                 */
                function Admit(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Admit feedKey.
                 * @member {Uint8Array} feedKey
                 * @memberof dxos.echo.testing.Admit
                 * @instance
                 */
                Admit.prototype.feedKey = $util.newBuffer([]);

                /**
                 * Creates a new Admit instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {dxos.echo.testing.IAdmit=} [properties] Properties to set
                 * @returns {dxos.echo.testing.Admit} Admit instance
                 */
                Admit.create = function create(properties) {
                    return new Admit(properties);
                };

                /**
                 * Encodes the specified Admit message. Does not implicitly {@link dxos.echo.testing.Admit.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {dxos.echo.testing.IAdmit} message Admit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Admit.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.feedKey != null && Object.hasOwnProperty.call(message, "feedKey"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.feedKey);
                    return writer;
                };

                /**
                 * Encodes the specified Admit message, length delimited. Does not implicitly {@link dxos.echo.testing.Admit.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {dxos.echo.testing.IAdmit} message Admit message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Admit.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an Admit message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.Admit} Admit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Admit.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.Admit();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.feedKey = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an Admit message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.Admit} Admit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Admit.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an Admit message.
                 * @function verify
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Admit.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        if (!(message.feedKey && typeof message.feedKey.length === "number" || $util.isString(message.feedKey)))
                            return "feedKey: buffer expected";
                    return null;
                };

                /**
                 * Creates an Admit message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.Admit} Admit
                 */
                Admit.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.Admit)
                        return object;
                    var message = new $root.dxos.echo.testing.Admit();
                    if (object.feedKey != null)
                        if (typeof object.feedKey === "string")
                            $util.base64.decode(object.feedKey, message.feedKey = $util.newBuffer($util.base64.length(object.feedKey)), 0);
                        else if (object.feedKey.length)
                            message.feedKey = object.feedKey;
                    return message;
                };

                /**
                 * Creates a plain object from an Admit message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.Admit
                 * @static
                 * @param {dxos.echo.testing.Admit} message Admit
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Admit.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        if (options.bytes === String)
                            object.feedKey = "";
                        else {
                            object.feedKey = [];
                            if (options.bytes !== Array)
                                object.feedKey = $util.newBuffer(object.feedKey);
                        }
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        object.feedKey = options.bytes === String ? $util.base64.encode(message.feedKey, 0, message.feedKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.feedKey) : message.feedKey;
                    return object;
                };

                /**
                 * Converts this Admit to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.Admit
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Admit.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Admit;
            })();

            testing.Remove = (function() {

                /**
                 * Properties of a Remove.
                 * @memberof dxos.echo.testing
                 * @interface IRemove
                 * @property {Uint8Array|null} [feedKey] Remove feedKey
                 */

                /**
                 * Constructs a new Remove.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a Remove.
                 * @implements IRemove
                 * @constructor
                 * @param {dxos.echo.testing.IRemove=} [properties] Properties to set
                 */
                function Remove(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Remove feedKey.
                 * @member {Uint8Array} feedKey
                 * @memberof dxos.echo.testing.Remove
                 * @instance
                 */
                Remove.prototype.feedKey = $util.newBuffer([]);

                /**
                 * Creates a new Remove instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {dxos.echo.testing.IRemove=} [properties] Properties to set
                 * @returns {dxos.echo.testing.Remove} Remove instance
                 */
                Remove.create = function create(properties) {
                    return new Remove(properties);
                };

                /**
                 * Encodes the specified Remove message. Does not implicitly {@link dxos.echo.testing.Remove.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {dxos.echo.testing.IRemove} message Remove message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Remove.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.feedKey != null && Object.hasOwnProperty.call(message, "feedKey"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.feedKey);
                    return writer;
                };

                /**
                 * Encodes the specified Remove message, length delimited. Does not implicitly {@link dxos.echo.testing.Remove.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {dxos.echo.testing.IRemove} message Remove message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Remove.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Remove message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.Remove} Remove
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Remove.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.Remove();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.feedKey = reader.bytes();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Remove message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.Remove} Remove
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Remove.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Remove message.
                 * @function verify
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Remove.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        if (!(message.feedKey && typeof message.feedKey.length === "number" || $util.isString(message.feedKey)))
                            return "feedKey: buffer expected";
                    return null;
                };

                /**
                 * Creates a Remove message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.Remove} Remove
                 */
                Remove.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.Remove)
                        return object;
                    var message = new $root.dxos.echo.testing.Remove();
                    if (object.feedKey != null)
                        if (typeof object.feedKey === "string")
                            $util.base64.decode(object.feedKey, message.feedKey = $util.newBuffer($util.base64.length(object.feedKey)), 0);
                        else if (object.feedKey.length)
                            message.feedKey = object.feedKey;
                    return message;
                };

                /**
                 * Creates a plain object from a Remove message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.Remove
                 * @static
                 * @param {dxos.echo.testing.Remove} message Remove
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                Remove.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        if (options.bytes === String)
                            object.feedKey = "";
                        else {
                            object.feedKey = [];
                            if (options.bytes !== Array)
                                object.feedKey = $util.newBuffer(object.feedKey);
                        }
                    if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                        object.feedKey = options.bytes === String ? $util.base64.encode(message.feedKey, 0, message.feedKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.feedKey) : message.feedKey;
                    return object;
                };

                /**
                 * Converts this Remove to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.Remove
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                Remove.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return Remove;
            })();

            testing.VectorTimestamp = (function() {

                /**
                 * Properties of a VectorTimestamp.
                 * @memberof dxos.echo.testing
                 * @interface IVectorTimestamp
                 * @property {Array.<dxos.echo.testing.VectorTimestamp.IFeed>|null} [timestamp] VectorTimestamp timestamp
                 */

                /**
                 * Constructs a new VectorTimestamp.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a VectorTimestamp.
                 * @implements IVectorTimestamp
                 * @constructor
                 * @param {dxos.echo.testing.IVectorTimestamp=} [properties] Properties to set
                 */
                function VectorTimestamp(properties) {
                    this.timestamp = [];
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * VectorTimestamp timestamp.
                 * @member {Array.<dxos.echo.testing.VectorTimestamp.IFeed>} timestamp
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @instance
                 */
                VectorTimestamp.prototype.timestamp = $util.emptyArray;

                /**
                 * Creates a new VectorTimestamp instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {dxos.echo.testing.IVectorTimestamp=} [properties] Properties to set
                 * @returns {dxos.echo.testing.VectorTimestamp} VectorTimestamp instance
                 */
                VectorTimestamp.create = function create(properties) {
                    return new VectorTimestamp(properties);
                };

                /**
                 * Encodes the specified VectorTimestamp message. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {dxos.echo.testing.IVectorTimestamp} message VectorTimestamp message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                VectorTimestamp.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.timestamp != null && message.timestamp.length)
                        for (var i = 0; i < message.timestamp.length; ++i)
                            $root.dxos.echo.testing.VectorTimestamp.Feed.encode(message.timestamp[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified VectorTimestamp message, length delimited. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {dxos.echo.testing.IVectorTimestamp} message VectorTimestamp message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                VectorTimestamp.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a VectorTimestamp message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.VectorTimestamp} VectorTimestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                VectorTimestamp.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.VectorTimestamp();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            if (!(message.timestamp && message.timestamp.length))
                                message.timestamp = [];
                            message.timestamp.push($root.dxos.echo.testing.VectorTimestamp.Feed.decode(reader, reader.uint32()));
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a VectorTimestamp message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.VectorTimestamp} VectorTimestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                VectorTimestamp.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a VectorTimestamp message.
                 * @function verify
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                VectorTimestamp.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.timestamp != null && message.hasOwnProperty("timestamp")) {
                        if (!Array.isArray(message.timestamp))
                            return "timestamp: array expected";
                        for (var i = 0; i < message.timestamp.length; ++i) {
                            var error = $root.dxos.echo.testing.VectorTimestamp.Feed.verify(message.timestamp[i]);
                            if (error)
                                return "timestamp." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a VectorTimestamp message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.VectorTimestamp} VectorTimestamp
                 */
                VectorTimestamp.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.VectorTimestamp)
                        return object;
                    var message = new $root.dxos.echo.testing.VectorTimestamp();
                    if (object.timestamp) {
                        if (!Array.isArray(object.timestamp))
                            throw TypeError(".dxos.echo.testing.VectorTimestamp.timestamp: array expected");
                        message.timestamp = [];
                        for (var i = 0; i < object.timestamp.length; ++i) {
                            if (typeof object.timestamp[i] !== "object")
                                throw TypeError(".dxos.echo.testing.VectorTimestamp.timestamp: object expected");
                            message.timestamp[i] = $root.dxos.echo.testing.VectorTimestamp.Feed.fromObject(object.timestamp[i]);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a VectorTimestamp message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @static
                 * @param {dxos.echo.testing.VectorTimestamp} message VectorTimestamp
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                VectorTimestamp.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.arrays || options.defaults)
                        object.timestamp = [];
                    if (message.timestamp && message.timestamp.length) {
                        object.timestamp = [];
                        for (var j = 0; j < message.timestamp.length; ++j)
                            object.timestamp[j] = $root.dxos.echo.testing.VectorTimestamp.Feed.toObject(message.timestamp[j], options);
                    }
                    return object;
                };

                /**
                 * Converts this VectorTimestamp to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.VectorTimestamp
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                VectorTimestamp.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                VectorTimestamp.Feed = (function() {

                    /**
                     * Properties of a Feed.
                     * @memberof dxos.echo.testing.VectorTimestamp
                     * @interface IFeed
                     * @property {Uint8Array|null} [feedKey] Feed feedKey
                     * @property {number|null} [feedIndex] Feed feedIndex
                     * @property {number|null} [seq] Feed seq
                     */

                    /**
                     * Constructs a new Feed.
                     * @memberof dxos.echo.testing.VectorTimestamp
                     * @classdesc Represents a Feed.
                     * @implements IFeed
                     * @constructor
                     * @param {dxos.echo.testing.VectorTimestamp.IFeed=} [properties] Properties to set
                     */
                    function Feed(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }

                    /**
                     * Feed feedKey.
                     * @member {Uint8Array} feedKey
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @instance
                     */
                    Feed.prototype.feedKey = $util.newBuffer([]);

                    /**
                     * Feed feedIndex.
                     * @member {number} feedIndex
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @instance
                     */
                    Feed.prototype.feedIndex = 0;

                    /**
                     * Feed seq.
                     * @member {number} seq
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @instance
                     */
                    Feed.prototype.seq = 0;

                    /**
                     * Creates a new Feed instance using the specified properties.
                     * @function create
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {dxos.echo.testing.VectorTimestamp.IFeed=} [properties] Properties to set
                     * @returns {dxos.echo.testing.VectorTimestamp.Feed} Feed instance
                     */
                    Feed.create = function create(properties) {
                        return new Feed(properties);
                    };

                    /**
                     * Encodes the specified Feed message. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.Feed.verify|verify} messages.
                     * @function encode
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {dxos.echo.testing.VectorTimestamp.IFeed} message Feed message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Feed.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.feedKey != null && Object.hasOwnProperty.call(message, "feedKey"))
                            writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.feedKey);
                        if (message.feedIndex != null && Object.hasOwnProperty.call(message, "feedIndex"))
                            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.feedIndex);
                        if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.seq);
                        return writer;
                    };

                    /**
                     * Encodes the specified Feed message, length delimited. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.Feed.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {dxos.echo.testing.VectorTimestamp.IFeed} message Feed message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Feed.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };

                    /**
                     * Decodes a Feed message from the specified reader or buffer.
                     * @function decode
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {dxos.echo.testing.VectorTimestamp.Feed} Feed
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Feed.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.VectorTimestamp.Feed();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                            case 1:
                                message.feedKey = reader.bytes();
                                break;
                            case 2:
                                message.feedIndex = reader.int32();
                                break;
                            case 3:
                                message.seq = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                            }
                        }
                        return message;
                    };

                    /**
                     * Decodes a Feed message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {dxos.echo.testing.VectorTimestamp.Feed} Feed
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Feed.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };

                    /**
                     * Verifies a Feed message.
                     * @function verify
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Feed.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                            if (!(message.feedKey && typeof message.feedKey.length === "number" || $util.isString(message.feedKey)))
                                return "feedKey: buffer expected";
                        if (message.feedIndex != null && message.hasOwnProperty("feedIndex"))
                            if (!$util.isInteger(message.feedIndex))
                                return "feedIndex: integer expected";
                        if (message.seq != null && message.hasOwnProperty("seq"))
                            if (!$util.isInteger(message.seq))
                                return "seq: integer expected";
                        return null;
                    };

                    /**
                     * Creates a Feed message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {dxos.echo.testing.VectorTimestamp.Feed} Feed
                     */
                    Feed.fromObject = function fromObject(object) {
                        if (object instanceof $root.dxos.echo.testing.VectorTimestamp.Feed)
                            return object;
                        var message = new $root.dxos.echo.testing.VectorTimestamp.Feed();
                        if (object.feedKey != null)
                            if (typeof object.feedKey === "string")
                                $util.base64.decode(object.feedKey, message.feedKey = $util.newBuffer($util.base64.length(object.feedKey)), 0);
                            else if (object.feedKey.length)
                                message.feedKey = object.feedKey;
                        if (object.feedIndex != null)
                            message.feedIndex = object.feedIndex | 0;
                        if (object.seq != null)
                            message.seq = object.seq | 0;
                        return message;
                    };

                    /**
                     * Creates a plain object from a Feed message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @static
                     * @param {dxos.echo.testing.VectorTimestamp.Feed} message Feed
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Feed.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            if (options.bytes === String)
                                object.feedKey = "";
                            else {
                                object.feedKey = [];
                                if (options.bytes !== Array)
                                    object.feedKey = $util.newBuffer(object.feedKey);
                            }
                            object.feedIndex = 0;
                            object.seq = 0;
                        }
                        if (message.feedKey != null && message.hasOwnProperty("feedKey"))
                            object.feedKey = options.bytes === String ? $util.base64.encode(message.feedKey, 0, message.feedKey.length) : options.bytes === Array ? Array.prototype.slice.call(message.feedKey) : message.feedKey;
                        if (message.feedIndex != null && message.hasOwnProperty("feedIndex"))
                            object.feedIndex = message.feedIndex;
                        if (message.seq != null && message.hasOwnProperty("seq"))
                            object.seq = message.seq;
                        return object;
                    };

                    /**
                     * Converts this Feed to JSON.
                     * @function toJSON
                     * @memberof dxos.echo.testing.VectorTimestamp.Feed
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Feed.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return Feed;
                })();

                return VectorTimestamp;
            })();

            testing.ItemEnvelope = (function() {

                /**
                 * Properties of an ItemEnvelope.
                 * @memberof dxos.echo.testing
                 * @interface IItemEnvelope
                 * @property {string|null} [itemId] ItemEnvelope itemId
                 * @property {dxos.echo.testing.IVectorTimestamp|null} [timestamp] ItemEnvelope timestamp
                 * @property {google.protobuf.IAny|null} [payload] ItemEnvelope payload
                 */

                /**
                 * Constructs a new ItemEnvelope.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents an ItemEnvelope.
                 * @implements IItemEnvelope
                 * @constructor
                 * @param {dxos.echo.testing.IItemEnvelope=} [properties] Properties to set
                 */
                function ItemEnvelope(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ItemEnvelope itemId.
                 * @member {string} itemId
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @instance
                 */
                ItemEnvelope.prototype.itemId = "";

                /**
                 * ItemEnvelope timestamp.
                 * @member {dxos.echo.testing.IVectorTimestamp|null|undefined} timestamp
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @instance
                 */
                ItemEnvelope.prototype.timestamp = null;

                /**
                 * ItemEnvelope payload.
                 * @member {google.protobuf.IAny|null|undefined} payload
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @instance
                 */
                ItemEnvelope.prototype.payload = null;

                /**
                 * Creates a new ItemEnvelope instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {dxos.echo.testing.IItemEnvelope=} [properties] Properties to set
                 * @returns {dxos.echo.testing.ItemEnvelope} ItemEnvelope instance
                 */
                ItemEnvelope.create = function create(properties) {
                    return new ItemEnvelope(properties);
                };

                /**
                 * Encodes the specified ItemEnvelope message. Does not implicitly {@link dxos.echo.testing.ItemEnvelope.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {dxos.echo.testing.IItemEnvelope} message ItemEnvelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemEnvelope.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.itemId != null && Object.hasOwnProperty.call(message, "itemId"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.itemId);
                    if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                        $root.dxos.echo.testing.VectorTimestamp.encode(message.timestamp, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                        $root.google.protobuf.Any.encode(message.payload, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified ItemEnvelope message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemEnvelope.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {dxos.echo.testing.IItemEnvelope} message ItemEnvelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemEnvelope.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an ItemEnvelope message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.ItemEnvelope} ItemEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemEnvelope.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.ItemEnvelope();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.itemId = reader.string();
                            break;
                        case 2:
                            message.timestamp = $root.dxos.echo.testing.VectorTimestamp.decode(reader, reader.uint32());
                            break;
                        case 3:
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
                 * Decodes an ItemEnvelope message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.ItemEnvelope} ItemEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemEnvelope.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an ItemEnvelope message.
                 * @function verify
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ItemEnvelope.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        if (!$util.isString(message.itemId))
                            return "itemId: string expected";
                    if (message.timestamp != null && message.hasOwnProperty("timestamp")) {
                        var error = $root.dxos.echo.testing.VectorTimestamp.verify(message.timestamp);
                        if (error)
                            return "timestamp." + error;
                    }
                    if (message.payload != null && message.hasOwnProperty("payload")) {
                        var error = $root.google.protobuf.Any.verify(message.payload);
                        if (error)
                            return "payload." + error;
                    }
                    return null;
                };

                /**
                 * Creates an ItemEnvelope message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.ItemEnvelope} ItemEnvelope
                 */
                ItemEnvelope.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.ItemEnvelope)
                        return object;
                    var message = new $root.dxos.echo.testing.ItemEnvelope();
                    if (object.itemId != null)
                        message.itemId = String(object.itemId);
                    if (object.timestamp != null) {
                        if (typeof object.timestamp !== "object")
                            throw TypeError(".dxos.echo.testing.ItemEnvelope.timestamp: object expected");
                        message.timestamp = $root.dxos.echo.testing.VectorTimestamp.fromObject(object.timestamp);
                    }
                    if (object.payload != null) {
                        if (typeof object.payload !== "object")
                            throw TypeError(".dxos.echo.testing.ItemEnvelope.payload: object expected");
                        message.payload = $root.google.protobuf.Any.fromObject(object.payload);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from an ItemEnvelope message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @static
                 * @param {dxos.echo.testing.ItemEnvelope} message ItemEnvelope
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ItemEnvelope.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.itemId = "";
                        object.timestamp = null;
                        object.payload = null;
                    }
                    if (message.itemId != null && message.hasOwnProperty("itemId"))
                        object.itemId = message.itemId;
                    if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                        object.timestamp = $root.dxos.echo.testing.VectorTimestamp.toObject(message.timestamp, options);
                    if (message.payload != null && message.hasOwnProperty("payload"))
                        object.payload = $root.google.protobuf.Any.toObject(message.payload, options);
                    return object;
                };

                /**
                 * Converts this ItemEnvelope to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.ItemEnvelope
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ItemEnvelope.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ItemEnvelope;
            })();

            testing.ItemGenesis = (function() {

                /**
                 * Properties of an ItemGenesis.
                 * @memberof dxos.echo.testing
                 * @interface IItemGenesis
                 * @property {string|null} [type] ItemGenesis type
                 * @property {string|null} [model] ItemGenesis model
                 * @property {string|null} [modelVersion] ItemGenesis modelVersion
                 */

                /**
                 * Constructs a new ItemGenesis.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents an ItemGenesis.
                 * @implements IItemGenesis
                 * @constructor
                 * @param {dxos.echo.testing.IItemGenesis=} [properties] Properties to set
                 */
                function ItemGenesis(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ItemGenesis type.
                 * @member {string} type
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @instance
                 */
                ItemGenesis.prototype.type = "";

                /**
                 * ItemGenesis model.
                 * @member {string} model
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @instance
                 */
                ItemGenesis.prototype.model = "";

                /**
                 * ItemGenesis modelVersion.
                 * @member {string} modelVersion
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @instance
                 */
                ItemGenesis.prototype.modelVersion = "";

                /**
                 * Creates a new ItemGenesis instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {dxos.echo.testing.IItemGenesis=} [properties] Properties to set
                 * @returns {dxos.echo.testing.ItemGenesis} ItemGenesis instance
                 */
                ItemGenesis.create = function create(properties) {
                    return new ItemGenesis(properties);
                };

                /**
                 * Encodes the specified ItemGenesis message. Does not implicitly {@link dxos.echo.testing.ItemGenesis.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {dxos.echo.testing.IItemGenesis} message ItemGenesis message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemGenesis.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.type);
                    if (message.model != null && Object.hasOwnProperty.call(message, "model"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.model);
                    if (message.modelVersion != null && Object.hasOwnProperty.call(message, "modelVersion"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.modelVersion);
                    return writer;
                };

                /**
                 * Encodes the specified ItemGenesis message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemGenesis.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {dxos.echo.testing.IItemGenesis} message ItemGenesis message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemGenesis.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an ItemGenesis message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.ItemGenesis} ItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemGenesis.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.ItemGenesis();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.type = reader.string();
                            break;
                        case 2:
                            message.model = reader.string();
                            break;
                        case 3:
                            message.modelVersion = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an ItemGenesis message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.ItemGenesis} ItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemGenesis.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an ItemGenesis message.
                 * @function verify
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ItemGenesis.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.type != null && message.hasOwnProperty("type"))
                        if (!$util.isString(message.type))
                            return "type: string expected";
                    if (message.model != null && message.hasOwnProperty("model"))
                        if (!$util.isString(message.model))
                            return "model: string expected";
                    if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                        if (!$util.isString(message.modelVersion))
                            return "modelVersion: string expected";
                    return null;
                };

                /**
                 * Creates an ItemGenesis message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.ItemGenesis} ItemGenesis
                 */
                ItemGenesis.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.ItemGenesis)
                        return object;
                    var message = new $root.dxos.echo.testing.ItemGenesis();
                    if (object.type != null)
                        message.type = String(object.type);
                    if (object.model != null)
                        message.model = String(object.model);
                    if (object.modelVersion != null)
                        message.modelVersion = String(object.modelVersion);
                    return message;
                };

                /**
                 * Creates a plain object from an ItemGenesis message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @static
                 * @param {dxos.echo.testing.ItemGenesis} message ItemGenesis
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ItemGenesis.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.type = "";
                        object.model = "";
                        object.modelVersion = "";
                    }
                    if (message.type != null && message.hasOwnProperty("type"))
                        object.type = message.type;
                    if (message.model != null && message.hasOwnProperty("model"))
                        object.model = message.model;
                    if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                        object.modelVersion = message.modelVersion;
                    return object;
                };

                /**
                 * Converts this ItemGenesis to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.ItemGenesis
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ItemGenesis.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ItemGenesis;
            })();

            testing.ItemMutation = (function() {

                /**
                 * Properties of an ItemMutation.
                 * @memberof dxos.echo.testing
                 * @interface IItemMutation
                 * @property {string|null} [key] ItemMutation key
                 * @property {string|null} [value] ItemMutation value
                 */

                /**
                 * Constructs a new ItemMutation.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents an ItemMutation.
                 * @implements IItemMutation
                 * @constructor
                 * @param {dxos.echo.testing.IItemMutation=} [properties] Properties to set
                 */
                function ItemMutation(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ItemMutation key.
                 * @member {string} key
                 * @memberof dxos.echo.testing.ItemMutation
                 * @instance
                 */
                ItemMutation.prototype.key = "";

                /**
                 * ItemMutation value.
                 * @member {string} value
                 * @memberof dxos.echo.testing.ItemMutation
                 * @instance
                 */
                ItemMutation.prototype.value = "";

                /**
                 * Creates a new ItemMutation instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {dxos.echo.testing.IItemMutation=} [properties] Properties to set
                 * @returns {dxos.echo.testing.ItemMutation} ItemMutation instance
                 */
                ItemMutation.create = function create(properties) {
                    return new ItemMutation(properties);
                };

                /**
                 * Encodes the specified ItemMutation message. Does not implicitly {@link dxos.echo.testing.ItemMutation.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {dxos.echo.testing.IItemMutation} message ItemMutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemMutation.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.key);
                    if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.value);
                    return writer;
                };

                /**
                 * Encodes the specified ItemMutation message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemMutation.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {dxos.echo.testing.IItemMutation} message ItemMutation message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ItemMutation.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an ItemMutation message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.ItemMutation} ItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemMutation.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.ItemMutation();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.key = reader.string();
                            break;
                        case 2:
                            message.value = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an ItemMutation message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.ItemMutation} ItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ItemMutation.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an ItemMutation message.
                 * @function verify
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ItemMutation.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.key != null && message.hasOwnProperty("key"))
                        if (!$util.isString(message.key))
                            return "key: string expected";
                    if (message.value != null && message.hasOwnProperty("value"))
                        if (!$util.isString(message.value))
                            return "value: string expected";
                    return null;
                };

                /**
                 * Creates an ItemMutation message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.ItemMutation} ItemMutation
                 */
                ItemMutation.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.ItemMutation)
                        return object;
                    var message = new $root.dxos.echo.testing.ItemMutation();
                    if (object.key != null)
                        message.key = String(object.key);
                    if (object.value != null)
                        message.value = String(object.value);
                    return message;
                };

                /**
                 * Creates a plain object from an ItemMutation message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.ItemMutation
                 * @static
                 * @param {dxos.echo.testing.ItemMutation} message ItemMutation
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ItemMutation.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.key = "";
                        object.value = "";
                    }
                    if (message.key != null && message.hasOwnProperty("key"))
                        object.key = message.key;
                    if (message.value != null && message.hasOwnProperty("value"))
                        object.value = message.value;
                    return object;
                };

                /**
                 * Converts this ItemMutation to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.ItemMutation
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ItemMutation.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ItemMutation;
            })();

            testing.TestData = (function() {

                /**
                 * Properties of a TestData.
                 * @memberof dxos.echo.testing
                 * @interface ITestData
                 * @property {number|null} [data] TestData data
                 */

                /**
                 * Constructs a new TestData.
                 * @memberof dxos.echo.testing
                 * @classdesc Represents a TestData.
                 * @implements ITestData
                 * @constructor
                 * @param {dxos.echo.testing.ITestData=} [properties] Properties to set
                 */
                function TestData(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * TestData data.
                 * @member {number} data
                 * @memberof dxos.echo.testing.TestData
                 * @instance
                 */
                TestData.prototype.data = 0;

                /**
                 * Creates a new TestData instance using the specified properties.
                 * @function create
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {dxos.echo.testing.ITestData=} [properties] Properties to set
                 * @returns {dxos.echo.testing.TestData} TestData instance
                 */
                TestData.create = function create(properties) {
                    return new TestData(properties);
                };

                /**
                 * Encodes the specified TestData message. Does not implicitly {@link dxos.echo.testing.TestData.verify|verify} messages.
                 * @function encode
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {dxos.echo.testing.ITestData} message TestData message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestData.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified TestData message, length delimited. Does not implicitly {@link dxos.echo.testing.TestData.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {dxos.echo.testing.ITestData} message TestData message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                TestData.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a TestData message from the specified reader or buffer.
                 * @function decode
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {dxos.echo.testing.TestData} TestData
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestData.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length, message = new $root.dxos.echo.testing.TestData();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1:
                            message.data = reader.int32();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a TestData message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {dxos.echo.testing.TestData} TestData
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                TestData.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a TestData message.
                 * @function verify
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                TestData.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!$util.isInteger(message.data))
                            return "data: integer expected";
                    return null;
                };

                /**
                 * Creates a TestData message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {dxos.echo.testing.TestData} TestData
                 */
                TestData.fromObject = function fromObject(object) {
                    if (object instanceof $root.dxos.echo.testing.TestData)
                        return object;
                    var message = new $root.dxos.echo.testing.TestData();
                    if (object.data != null)
                        message.data = object.data | 0;
                    return message;
                };

                /**
                 * Creates a plain object from a TestData message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof dxos.echo.testing.TestData
                 * @static
                 * @param {dxos.echo.testing.TestData} message TestData
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                TestData.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.data = 0;
                    if (message.data != null && message.hasOwnProperty("data"))
                        object.data = message.data;
                    return object;
                };

                /**
                 * Converts this TestData to JSON.
                 * @function toJSON
                 * @memberof dxos.echo.testing.TestData
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                TestData.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TestData;
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
