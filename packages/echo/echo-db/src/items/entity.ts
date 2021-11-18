import { ItemID, ItemType } from "@dxos/echo-protocol";

/**
 * Base class for all ECHO entitities.
 * 
 * Subclassed by Item and Link.
 */
export class Entity {
    constructor(
        private readonly _id: ItemID,
        private readonly _type: ItemType | undefined,
    ) {}

    get id(): ItemID {
        return this._id;
    }

    get type(): ItemType | undefined {
        return this._type;
    }
}