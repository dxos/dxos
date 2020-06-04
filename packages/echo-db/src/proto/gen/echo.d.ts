import * as $protobuf from "protobufjs";
/** Namespace dxos. */
export namespace dxos {

    /** Namespace echo. */
    namespace echo {

        /** Properties of a Value. */
        interface IValue {

            /** Value null */
            "null"?: (boolean|null);

            /** Value bool */
            bool?: (boolean|null);

            /** Value int */
            int?: (number|null);

            /** Value float */
            float?: (number|null);

            /** Value string */
            string?: (string|null);

            /** Value timestamp */
            timestamp?: (string|null);

            /** Value datetime */
            datetime?: (string|null);

            /** Value bytes */
            bytes?: (Uint8Array|null);

            /** Value object */
            object?: (dxos.echo.IObject|null);
        }

        /** Represents a Value. */
        class Value implements IValue {

            /**
             * Constructs a new Value.
             * @param [properties] Properties to set
             */
            constructor(properties?: dxos.echo.IValue);

            /** Value null. */
            public null: boolean;

            /** Value bool. */
            public bool: boolean;

            /** Value int. */
            public int: number;

            /** Value float. */
            public float: number;

            /** Value string. */
            public string: string;

            /** Value timestamp. */
            public timestamp: string;

            /** Value datetime. */
            public datetime: string;

            /** Value bytes. */
            public bytes: Uint8Array;

            /** Value object. */
            public object?: (dxos.echo.IObject|null);

            /** Value Type. */
            public Type?: ("null"|"bool"|"int"|"float"|"string"|"timestamp"|"datetime"|"bytes"|"object");

            /**
             * Creates a new Value instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Value instance
             */
            public static create(properties?: dxos.echo.IValue): dxos.echo.Value;

            /**
             * Encodes the specified Value message. Does not implicitly {@link dxos.echo.Value.verify|verify} messages.
             * @param message Value message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: dxos.echo.IValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Value message, length delimited. Does not implicitly {@link dxos.echo.Value.verify|verify} messages.
             * @param message Value message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: dxos.echo.IValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Value message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Value
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.Value;

            /**
             * Decodes a Value message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Value
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.Value;

            /**
             * Verifies a Value message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Value message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Value
             */
            public static fromObject(object: { [k: string]: any }): dxos.echo.Value;

            /**
             * Creates a plain object from a Value message. Also converts values to other types if specified.
             * @param message Value
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: dxos.echo.Value, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Value to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of an Object. */
        interface IObject {

            /** Object properties */
            properties?: (dxos.echo.IKeyValue[]|null);
        }

        /** Represents an Object. */
        class Object implements IObject {

            /**
             * Constructs a new Object.
             * @param [properties] Properties to set
             */
            constructor(properties?: dxos.echo.IObject);

            /** Object properties. */
            public properties: dxos.echo.IKeyValue[];

            /**
             * Creates a new Object instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Object instance
             */
            public static create(properties?: dxos.echo.IObject): dxos.echo.object;

            /**
             * Encodes the specified Object message. Does not implicitly {@link dxos.echo.Object.verify|verify} messages.
             * @param message Object message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: dxos.echo.IObject, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Object message, length delimited. Does not implicitly {@link dxos.echo.Object.verify|verify} messages.
             * @param message Object message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: dxos.echo.IObject, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Object message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Object
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.object;

            /**
             * Decodes an Object message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Object
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.object;

            /**
             * Verifies an Object message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Object message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Object
             */
            public static fromObject(object: { [k: string]: any }): dxos.echo.object;

            /**
             * Creates a plain object from an Object message. Also converts values to other types if specified.
             * @param message Object
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: dxos.echo.object, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Object to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of a KeyValue. */
        interface IKeyValue {

            /** KeyValue key */
            key?: (string|null);

            /** KeyValue value */
            value?: (dxos.echo.IValue|null);
        }

        /** Represents a KeyValue. */
        class KeyValue implements IKeyValue {

            /**
             * Constructs a new KeyValue.
             * @param [properties] Properties to set
             */
            constructor(properties?: dxos.echo.IKeyValue);

            /** KeyValue key. */
            public key: string;

            /** KeyValue value. */
            public value?: (dxos.echo.IValue|null);

            /**
             * Creates a new KeyValue instance using the specified properties.
             * @param [properties] Properties to set
             * @returns KeyValue instance
             */
            public static create(properties?: dxos.echo.IKeyValue): dxos.echo.KeyValue;

            /**
             * Encodes the specified KeyValue message. Does not implicitly {@link dxos.echo.KeyValue.verify|verify} messages.
             * @param message KeyValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: dxos.echo.IKeyValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified KeyValue message, length delimited. Does not implicitly {@link dxos.echo.KeyValue.verify|verify} messages.
             * @param message KeyValue message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: dxos.echo.IKeyValue, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a KeyValue message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns KeyValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.KeyValue;

            /**
             * Decodes a KeyValue message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns KeyValue
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.KeyValue;

            /**
             * Verifies a KeyValue message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a KeyValue message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns KeyValue
             */
            public static fromObject(object: { [k: string]: any }): dxos.echo.KeyValue;

            /**
             * Creates a plain object from a KeyValue message. Also converts values to other types if specified.
             * @param message KeyValue
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: dxos.echo.KeyValue, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this KeyValue to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        /** Properties of an ObjectMutation. */
        interface IObjectMutation {

            /** ObjectMutation objectId */
            objectId?: (string|null);

            /** ObjectMutation id */
            id?: (string|null);

            /** ObjectMutation dependency */
            dependency?: (string|null);

            /** ObjectMutation deleted */
            deleted?: (boolean|null);

            /** ObjectMutation mutations */
            mutations?: (dxos.echo.ObjectMutation.IMutation[]|null);
        }

        /** Represents an ObjectMutation. */
        class ObjectMutation implements IObjectMutation {

            /**
             * Constructs a new ObjectMutation.
             * @param [properties] Properties to set
             */
            constructor(properties?: dxos.echo.IObjectMutation);

            /** ObjectMutation objectId. */
            public objectId: string;

            /** ObjectMutation id. */
            public id: string;

            /** ObjectMutation dependency. */
            public dependency: string;

            /** ObjectMutation deleted. */
            public deleted: boolean;

            /** ObjectMutation mutations. */
            public mutations: dxos.echo.ObjectMutation.IMutation[];

            /**
             * Creates a new ObjectMutation instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ObjectMutation instance
             */
            public static create(properties?: dxos.echo.IObjectMutation): dxos.echo.ObjectMutation;

            /**
             * Encodes the specified ObjectMutation message. Does not implicitly {@link dxos.echo.ObjectMutation.verify|verify} messages.
             * @param message ObjectMutation message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: dxos.echo.IObjectMutation, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ObjectMutation message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutation.verify|verify} messages.
             * @param message ObjectMutation message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: dxos.echo.IObjectMutation, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an ObjectMutation message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ObjectMutation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.ObjectMutation;

            /**
             * Decodes an ObjectMutation message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ObjectMutation
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.ObjectMutation;

            /**
             * Verifies an ObjectMutation message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an ObjectMutation message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ObjectMutation
             */
            public static fromObject(object: { [k: string]: any }): dxos.echo.ObjectMutation;

            /**
             * Creates a plain object from an ObjectMutation message. Also converts values to other types if specified.
             * @param message ObjectMutation
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: dxos.echo.ObjectMutation, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ObjectMutation to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }

        namespace ObjectMutation {

            /** Operation enum. */
            enum Operation {
                SET = 0,
                DELETE = 1,
                ARRAY_PUSH = 2,
                SET_ADD = 3,
                SET_DELETE = 4
            }

            /** Properties of a Mutation. */
            interface IMutation {

                /** Mutation operation */
                operation?: (dxos.echo.ObjectMutation.Operation|null);

                /** Mutation key */
                key?: (string|null);

                /** Mutation value */
                value?: (dxos.echo.IValue|null);
            }

            /** Represents a Mutation. */
            class Mutation implements IMutation {

                /**
                 * Constructs a new Mutation.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: dxos.echo.ObjectMutation.IMutation);

                /** Mutation operation. */
                public operation: dxos.echo.ObjectMutation.Operation;

                /** Mutation key. */
                public key: string;

                /** Mutation value. */
                public value?: (dxos.echo.IValue|null);

                /**
                 * Creates a new Mutation instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns Mutation instance
                 */
                public static create(properties?: dxos.echo.ObjectMutation.IMutation): dxos.echo.ObjectMutation.Mutation;

                /**
                 * Encodes the specified Mutation message. Does not implicitly {@link dxos.echo.ObjectMutation.Mutation.verify|verify} messages.
                 * @param message Mutation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: dxos.echo.ObjectMutation.IMutation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Mutation message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutation.Mutation.verify|verify} messages.
                 * @param message Mutation message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: dxos.echo.ObjectMutation.IMutation, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Mutation message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Mutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.ObjectMutation.Mutation;

                /**
                 * Decodes a Mutation message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Mutation
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.ObjectMutation.Mutation;

                /**
                 * Verifies a Mutation message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a Mutation message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns Mutation
                 */
                public static fromObject(object: { [k: string]: any }): dxos.echo.ObjectMutation.Mutation;

                /**
                 * Creates a plain object from a Mutation message. Also converts values to other types if specified.
                 * @param message Mutation
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                public static toObject(message: dxos.echo.ObjectMutation.Mutation, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this Mutation to JSON.
                 * @returns JSON object
                 */
                public toJSON(): { [k: string]: any };
            }
        }

        /** Properties of an ObjectMutationSet. */
        interface IObjectMutationSet {

            /** ObjectMutationSet mutations */
            mutations?: (dxos.echo.IObjectMutation[]|null);
        }

        /** Represents an ObjectMutationSet. */
        class ObjectMutationSet implements IObjectMutationSet {

            /**
             * Constructs a new ObjectMutationSet.
             * @param [properties] Properties to set
             */
            constructor(properties?: dxos.echo.IObjectMutationSet);

            /** ObjectMutationSet mutations. */
            public mutations: dxos.echo.IObjectMutation[];

            /**
             * Creates a new ObjectMutationSet instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ObjectMutationSet instance
             */
            public static create(properties?: dxos.echo.IObjectMutationSet): dxos.echo.ObjectMutationSet;

            /**
             * Encodes the specified ObjectMutationSet message. Does not implicitly {@link dxos.echo.ObjectMutationSet.verify|verify} messages.
             * @param message ObjectMutationSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: dxos.echo.IObjectMutationSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ObjectMutationSet message, length delimited. Does not implicitly {@link dxos.echo.ObjectMutationSet.verify|verify} messages.
             * @param message ObjectMutationSet message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: dxos.echo.IObjectMutationSet, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an ObjectMutationSet message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ObjectMutationSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): dxos.echo.ObjectMutationSet;

            /**
             * Decodes an ObjectMutationSet message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ObjectMutationSet
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): dxos.echo.ObjectMutationSet;

            /**
             * Verifies an ObjectMutationSet message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an ObjectMutationSet message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ObjectMutationSet
             */
            public static fromObject(object: { [k: string]: any }): dxos.echo.ObjectMutationSet;

            /**
             * Creates a plain object from an ObjectMutationSet message. Also converts values to other types if specified.
             * @param message ObjectMutationSet
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: dxos.echo.ObjectMutationSet, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ObjectMutationSet to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };
        }
    }
}
