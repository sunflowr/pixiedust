/*export class DataType {
    constructor(_size, _type, _default) {
        this._size = _size;
        this._type = _type;
        this._default = _default;
    }

    get size() { return this._size; }
    get type() { return this._type; }
    get default() { return this._default; }

}*/
/**
 * @typedef {Object} DataType
 * @property {Number} size - Size in bytes of data type.
 * @property {String} type - Storage type.
 * @property {*} default - Default value.
 */

export const DataTypes = {
    /*bool: new DataType(1, "boolean", false),
    string24: new DataType(24, "string", ""),*/
    /** @type {DataType} */
    bool: {
        size: 1,
        type: "boolean",
        default: false
    },
    /** @type {DataType} */
    string24: {
        size: 24,
        type: "string",
        default: ""
    },
    /** @type {DataType} */
    uint8: {
        size: 1,
        type: "number",
        default: 0
    },
    /** @type {DataType} */
    uint16: {
        size: 2,
        type: "number",
        default: 0
    },
    /** @type {DataType} */
    uint16rev: {
        size: 2,
        type: "number",
        default: 0
    },
    /** @type {DataType} */
    uint32: {
        size: 4,
        type: "number",
        default: 0
    },
    /** @type {DataType} */
    uint32rev: {
        size: 4,
        type: "number",
        default: 0
    }
};
