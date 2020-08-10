import * as $protobuf from "protobufjs";
/** Namespace dxos. */
export namespace dxos {

    /** Namespace echo. */
    namespace echo {

        /** Namespace testing. */
        namespace testing {

            /** Properties of a FeedMessage. */
            interface IFeedMessage {

                /** FeedMessage feedKey */
                feedKey?: (Uint8Array|null);

                /** FeedMessage data */
                data?: (dxos.echo.testing.IEnvelope|null);
            }

            /** Represents a FeedMessage. */
            class FeedMessage implements IFeedMessage {

                /**
                 * Constructs a new FeedMessage.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IFeedMessage);

                /** FeedMessage feedKey. */
                public feedKey: Uint8Array;

                /** FeedMessage data. */
                public data?: (dxos.echo.testing.IEnvelope|null);

                /**
                 * Creates a new FeedMessage instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns FeedMessage instance
                 */
                public static create(properties?: dxos.echo.testing.IFeedMessage): dxos.echo.testing.FeedMessage;

                /**
                 * Encodes the specified FeedMessage message. Does not implicitly {@link dxos.echo.testing.FeedMessage.verify|verify} messages.
                 * @param message FeedMessage message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IFeedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified FeedMessage message, length delimited. Does not implicitly {@link dxos.echo.testing.FeedMessage.verify|verify} messages.
                 * @param message FeedMessage message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IFeedMessage, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a FeedMessage message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns FeedMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.FeedMessage;

                /**
                 * Decodes a FeedMessage message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns FeedMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.FeedMessage;

                /**
                 * Verifies a FeedMessage message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a FeedMessage message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns FeedMessage
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.FeedMessage;

                /**
                 * Creates a plain object from a FeedMessage message. Also converts values to other types if specified.
                 * @param message FeedMessage
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.FeedMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this FeedMessage to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of an Envelope. */
            interface IEnvelope {

                /** Envelope message */
                message?: (google.protobuf.IAny|null);
            }

            /** Represents an Envelope. */
            class Envelope implements IEnvelope {

                /**
                 * Constructs a new Envelope.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IEnvelope);

                /** Envelope message. */
                public message?: (google.protobuf.IAny|null);

                /**
                 * Creates a new Envelope instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Envelope instance
                 */
                public static create(properties?: dxos.echo.testing.IEnvelope): dxos.echo.testing.Envelope;

                /**
                 * Encodes the specified Envelope message. Does not implicitly {@link dxos.echo.testing.Envelope.verify|verify} messages.
                 * @param message Envelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IEnvelope, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Envelope message, length delimited. Does not implicitly {@link dxos.echo.testing.Envelope.verify|verify} messages.
                 * @param message Envelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IEnvelope, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Envelope message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Envelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.Envelope;

                /**
                 * Decodes an Envelope message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Envelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.Envelope;

                /**
                 * Verifies an Envelope message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Envelope
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.Envelope;

                /**
                 * Creates a plain object from an Envelope message. Also converts values to other types if specified.
                 * @param message Envelope
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.Envelope, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Envelope to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of an Admit. */
            interface IAdmit {

                /** Admit feedKey */
                feedKey?: (Uint8Array|null);
            }

            /** Represents an Admit. */
            class Admit implements IAdmit {

                /**
                 * Constructs a new Admit.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IAdmit);

                /** Admit feedKey. */
                public feedKey: Uint8Array;

                /**
                 * Creates a new Admit instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Admit instance
                 */
                public static create(properties?: dxos.echo.testing.IAdmit): dxos.echo.testing.Admit;

                /**
                 * Encodes the specified Admit message. Does not implicitly {@link dxos.echo.testing.Admit.verify|verify} messages.
                 * @param message Admit message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IAdmit, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Admit message, length delimited. Does not implicitly {@link dxos.echo.testing.Admit.verify|verify} messages.
                 * @param message Admit message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IAdmit, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Admit message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Admit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.Admit;

                /**
                 * Decodes an Admit message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Admit
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.Admit;

                /**
                 * Verifies an Admit message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an Admit message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Admit
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.Admit;

                /**
                 * Creates a plain object from an Admit message. Also converts values to other types if specified.
                 * @param message Admit
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.Admit, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Admit to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of a Remove. */
            interface IRemove {

                /** Remove feedKey */
                feedKey?: (Uint8Array|null);
            }

            /** Represents a Remove. */
            class Remove implements IRemove {

                /**
                 * Constructs a new Remove.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IRemove);

                /** Remove feedKey. */
                public feedKey: Uint8Array;

                /**
                 * Creates a new Remove instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Remove instance
                 */
                public static create(properties?: dxos.echo.testing.IRemove): dxos.echo.testing.Remove;

                /**
                 * Encodes the specified Remove message. Does not implicitly {@link dxos.echo.testing.Remove.verify|verify} messages.
                 * @param message Remove message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IRemove, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Remove message, length delimited. Does not implicitly {@link dxos.echo.testing.Remove.verify|verify} messages.
                 * @param message Remove message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IRemove, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Remove message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Remove
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.Remove;

                /**
                 * Decodes a Remove message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Remove
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.Remove;

                /**
                 * Verifies a Remove message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Remove message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Remove
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.Remove;

                /**
                 * Creates a plain object from a Remove message. Also converts values to other types if specified.
                 * @param message Remove
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.Remove, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Remove to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of a VectorTimestamp. */
            interface IVectorTimestamp {

                /** VectorTimestamp timestamp */
                timestamp?: (dxos.echo.testing.VectorTimestamp.IFeed[]|null);
            }

            /** Represents a VectorTimestamp. */
            class VectorTimestamp implements IVectorTimestamp {

                /**
                 * Constructs a new VectorTimestamp.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IVectorTimestamp);

                /** VectorTimestamp timestamp. */
                public timestamp: dxos.echo.testing.VectorTimestamp.IFeed[];

                /**
                 * Creates a new VectorTimestamp instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns VectorTimestamp instance
                 */
                public static create(properties?: dxos.echo.testing.IVectorTimestamp): dxos.echo.testing.VectorTimestamp;

                /**
                 * Encodes the specified VectorTimestamp message. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.verify|verify} messages.
                 * @param message VectorTimestamp message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IVectorTimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified VectorTimestamp message, length delimited. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.verify|verify} messages.
                 * @param message VectorTimestamp message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IVectorTimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a VectorTimestamp message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns VectorTimestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.VectorTimestamp;

                /**
                 * Decodes a VectorTimestamp message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns VectorTimestamp
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.VectorTimestamp;

                /**
                 * Verifies a VectorTimestamp message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a VectorTimestamp message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns VectorTimestamp
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.VectorTimestamp;

                /**
                 * Creates a plain object from a VectorTimestamp message. Also converts values to other types if specified.
                 * @param message VectorTimestamp
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.VectorTimestamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this VectorTimestamp to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            namespace VectorTimestamp {

                /** Properties of a Feed. */
                interface IFeed {

                    /** Feed feedKey */
                    feedKey?: (Uint8Array|null);

                    /** Feed feedIndex */
                    feedIndex?: (number|null);

                    /** Feed seq */
                    seq?: (number|null);
                }

                /** Represents a Feed. */
                class Feed implements IFeed {

                    /**
                     * Constructs a new Feed.
                     * @param [properties] Properties to set
                     */
                    constructor(properties?: dxos.echo.testing.VectorTimestamp.IFeed);

                    /** Feed feedKey. */
                    public feedKey: Uint8Array;

                    /** Feed feedIndex. */
                    public feedIndex: number;

                    /** Feed seq. */
                    public seq: number;

                    /**
                     * Creates a new Feed instance using the specified properties.
                     * @param [properties] Properties to set
                     * @returns Feed instance
                     */
                    public static create(properties?: dxos.echo.testing.VectorTimestamp.IFeed): dxos.echo.testing.VectorTimestamp.Feed;

                    /**
                     * Encodes the specified Feed message. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.Feed.verify|verify} messages.
                     * @param message Feed message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encode(message: dxos.echo.testing.VectorTimestamp.IFeed, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Encodes the specified Feed message, length delimited. Does not implicitly {@link dxos.echo.testing.VectorTimestamp.Feed.verify|verify} messages.
                     * @param message Feed message or plain object to encode
                     * @param [writer] Writer to encode to
                     * @returns Writer
                     */
                    public static encodeDelimited(message: dxos.echo.testing.VectorTimestamp.IFeed, writer?: $protobuf.Writer): $protobuf.Writer;

                    /**
                     * Decodes a Feed message from the specified reader or buffer.
                     * @param reader Reader or buffer to decode from
                     * @param [length] Message length if known beforehand
                     * @returns Feed
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.VectorTimestamp.Feed;

                    /**
                     * Decodes a Feed message from the specified reader or buffer, length delimited.
                     * @param reader Reader or buffer to decode from
                     * @returns Feed
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.VectorTimestamp.Feed;

                    /**
                     * Verifies a Feed message.
                     * @param message Plain object to verify
                     * @returns `null` if valid, otherwise the reason why it is not
                     */
                    public static verify(message: { [k: string]: any }): (string|null);

                    /**
                     * Creates a Feed message from a plain object. Also converts values to their respective internal types.
                     * @param object Plain object
                     * @returns Feed
                     */
                    public static fromObject(object: { [k: string]: any }): dxos.echo.testing.VectorTimestamp.Feed;

                    /**
                     * Creates a plain object from a Feed message. Also converts values to other types if specified.
                     * @param message Feed
                     * @param [options] Conversion options
                     * @returns Plain object
                     */
                    public static toObject(message: dxos.echo.testing.VectorTimestamp.Feed, options?: $protobuf.IConversionOptions): { [k: string]: any };

                    /**
                     * Converts this Feed to JSON.
                     * @returns JSON object
                     */
                    public toJSON(): { [k: string]: any };
                }
            }

            /** Properties of an ItemEnvelope. */
            interface IItemEnvelope {

                /** ItemEnvelope itemId */
                itemId?: (string|null);

                /** ItemEnvelope timestamp */
                timestamp?: (dxos.echo.testing.IVectorTimestamp|null);

                /** ItemEnvelope payload */
                payload?: (google.protobuf.IAny|null);
            }

            /** Represents an ItemEnvelope. */
            class ItemEnvelope implements IItemEnvelope {

                /**
                 * Constructs a new ItemEnvelope.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IItemEnvelope);

                /** ItemEnvelope itemId. */
                public itemId: string;

                /** ItemEnvelope timestamp. */
                public timestamp?: (dxos.echo.testing.IVectorTimestamp|null);

                /** ItemEnvelope payload. */
                public payload?: (google.protobuf.IAny|null);

                /**
                 * Creates a new ItemEnvelope instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ItemEnvelope instance
                 */
                public static create(properties?: dxos.echo.testing.IItemEnvelope): dxos.echo.testing.ItemEnvelope;

                /**
                 * Encodes the specified ItemEnvelope message. Does not implicitly {@link dxos.echo.testing.ItemEnvelope.verify|verify} messages.
                 * @param message ItemEnvelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IItemEnvelope, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ItemEnvelope message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemEnvelope.verify|verify} messages.
                 * @param message ItemEnvelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IItemEnvelope, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ItemEnvelope message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ItemEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.ItemEnvelope;

                /**
                 * Decodes an ItemEnvelope message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ItemEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.ItemEnvelope;

                /**
                 * Verifies an ItemEnvelope message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ItemEnvelope message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ItemEnvelope
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.ItemEnvelope;

                /**
                 * Creates a plain object from an ItemEnvelope message. Also converts values to other types if specified.
                 * @param message ItemEnvelope
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.ItemEnvelope, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ItemEnvelope to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of an ItemGenesis. */
            interface IItemGenesis {

                /** ItemGenesis type */
                type?: (string|null);

                /** ItemGenesis model */
                model?: (string|null);
            }

            /** Represents an ItemGenesis. */
            class ItemGenesis implements IItemGenesis {

                /**
                 * Constructs a new ItemGenesis.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IItemGenesis);

                /** ItemGenesis type. */
                public type: string;

                /** ItemGenesis model. */
                public model: string;

                /**
                 * Creates a new ItemGenesis instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ItemGenesis instance
                 */
                public static create(properties?: dxos.echo.testing.IItemGenesis): dxos.echo.testing.ItemGenesis;

                /**
                 * Encodes the specified ItemGenesis message. Does not implicitly {@link dxos.echo.testing.ItemGenesis.verify|verify} messages.
                 * @param message ItemGenesis message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IItemGenesis, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ItemGenesis message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemGenesis.verify|verify} messages.
                 * @param message ItemGenesis message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IItemGenesis, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ItemGenesis message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.ItemGenesis;

                /**
                 * Decodes an ItemGenesis message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ItemGenesis
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.ItemGenesis;

                /**
                 * Verifies an ItemGenesis message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ItemGenesis message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ItemGenesis
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.ItemGenesis;

                /**
                 * Creates a plain object from an ItemGenesis message. Also converts values to other types if specified.
                 * @param message ItemGenesis
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.ItemGenesis, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ItemGenesis to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of an ItemMutation. */
            interface IItemMutation {

                /** ItemMutation key */
                key?: (string|null);

                /** ItemMutation value */
                value?: (string|null);
            }

            /** Represents an ItemMutation. */
            class ItemMutation implements IItemMutation {

                /**
                 * Constructs a new ItemMutation.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.IItemMutation);

                /** ItemMutation key. */
                public key: string;

                /** ItemMutation value. */
                public value: string;

                /**
                 * Creates a new ItemMutation instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ItemMutation instance
                 */
                public static create(properties?: dxos.echo.testing.IItemMutation): dxos.echo.testing.ItemMutation;

                /**
                 * Encodes the specified ItemMutation message. Does not implicitly {@link dxos.echo.testing.ItemMutation.verify|verify} messages.
                 * @param message ItemMutation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.IItemMutation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ItemMutation message, length delimited. Does not implicitly {@link dxos.echo.testing.ItemMutation.verify|verify} messages.
                 * @param message ItemMutation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.IItemMutation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ItemMutation message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.ItemMutation;

                /**
                 * Decodes an ItemMutation message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ItemMutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.ItemMutation;

                /**
                 * Verifies an ItemMutation message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ItemMutation message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ItemMutation
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.ItemMutation;

                /**
                 * Creates a plain object from an ItemMutation message. Also converts values to other types if specified.
                 * @param message ItemMutation
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.ItemMutation, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ItemMutation to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }

            /** Properties of a TestData. */
            interface ITestData {

                /** TestData data */
                data?: (number|null);
            }

            /** Represents a TestData. */
            class TestData implements ITestData {

                /**
                 * Constructs a new TestData.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.testing.ITestData);

                /** TestData data. */
                public data: number;

                /**
                 * Creates a new TestData instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns TestData instance
                 */
                public static create(properties?: dxos.echo.testing.ITestData): dxos.echo.testing.TestData;

                /**
                 * Encodes the specified TestData message. Does not implicitly {@link dxos.echo.testing.TestData.verify|verify} messages.
                 * @param message TestData message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.testing.ITestData, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified TestData message, length delimited. Does not implicitly {@link dxos.echo.testing.TestData.verify|verify} messages.
                 * @param message TestData message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.testing.ITestData, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a TestData message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns TestData
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.testing.TestData;

                /**
                 * Decodes a TestData message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns TestData
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.testing.TestData;

                /**
                 * Verifies a TestData message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a TestData message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns TestData
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.testing.TestData;

                /**
                 * Creates a plain object from a TestData message. Also converts values to other types if specified.
                 * @param message TestData
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.testing.TestData, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this TestData to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }
        }
    }
}

/** Namespace google. */
export namespace google {

    /** Namespace protobuf. */
    namespace protobuf {

        /** Properties of an Any. */
        interface IAny {

            /** Any type_url */
            type_url?: (string|null);

            /** Any value */
            value?: (Uint8Array|null);
        }

        /** Represents an Any. */
        class Any implements IAny {

            /**
             * Constructs a new Any.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.IAny);

            /** Any type_url. */
            public type_url: string;

            /** Any value. */
            public value: Uint8Array;

            /**
             * Creates a new Any instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Any instance
             */
            public static create(properties?: google.protobuf.IAny): google.protobuf.Any;

            /**
             * Encodes the specified Any message. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @param message Any message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Any message, length delimited. Does not implicitly {@link google.protobuf.Any.verify|verify} messages.
             * @param message Any message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.IAny, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Any message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Any;

            /**
             * Decodes an Any message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Any
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Any;

            /**
             * Verifies an Any message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Any message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Any
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Any;

            /**
             * Creates a plain object from an Any message. Also converts values to other types if specified.
             * @param message Any
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Any, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Any to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }
    }
}
