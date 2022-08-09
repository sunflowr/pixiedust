import { DataTypes } from "@/datatypes";

export class BinarySerializer {
    constructor(data = []) {
        this._data = data;
        this._readPosition = 0;
    }

    /**
     * Returns the serialized data as a Uint8Array.
     * @returns {Uint8Array} - The serialized data.
     */
    get data() { return new Uint8Array(this._data) }

    /**
     * Pushes an uint8 array to the serializer.
     * @param {Uint8Array} array - Array to push to the serializer.
     * @returns {BinarySerializer} - This object for chaining.
     */
    push(array) {
        const newBuffer = new Uint8Array(this._data.length + array.length);
        newBuffer.set(this._data);
        for(let i = 0; i < array.length; ++i) {
            newBuffer[this._data.length + i] = (array[i] >>> 0) & 0xff;
        }
        this._data = newBuffer;
        return this;
    }

    /**
     * Serialize a value in to this binary data stream.
     * @param {DataType} type - Data type of the value.
     * @param {Number} value - Value to serialize.
     * @returns {BinarySerializer} - This object for chaining.
     */
    serialize(type, value) {
        switch (type) {
            case DataTypes.bool:
                return this.push(new Uint8Array([
                    ((value ? 1 : 0) >>> 0) & 0xff
                ]));
            // TODO: Add support for string24
            /*case DataTypes.string24:
                {
                    const value = new TextDecoder("utf-8").decode(this._data.slice(this._readPosition, this._readPosition + 24));
                    this._readPosition += 24;
                    return value;
                }*/
            case DataTypes.uint8:
                return this.push(new Uint8Array([
                    (value >>> 0) & 0xff
                ]));
            case DataTypes.uint16:
                return this.push(new Uint8Array([
                    (value >>> 8) & 0xff,
                    (value >>> 0) & 0xff
                ]));
            case DataTypes.uint32:
                return this.push(new Uint8Array([
                    (value >>> 24) & 0xff,
                    (value >>> 16) & 0xff,
                    (value >>> 8) & 0xff,
                    (value >>> 0) & 0xff
                ]));
            default:
                throw TypeError("Unknown data type.");
        }
    }

    deserialize(type) {
        switch (type) {
            case DataTypes.bool:
                return ((this._data[this._readPosition++] >>> 0) !== 0);
            case DataTypes.string24:
                {
                    const value = new TextDecoder("utf-8").decode(this._data.slice(this._readPosition, this._readPosition + 24));
                    this._readPosition += 24;
                    return value;
                }
            case DataTypes.uint8:
                return (this._data[this._readPosition++]) >>> 0;
            case DataTypes.uint16:
                return (this._data[this._readPosition++] |
                    (this._data[this._readPosition++] << 8)) >>> 0;
            case DataTypes.uint32:
                return (this._data[this._readPosition++] |
                    (this._data[this._readPosition++] << 8) |
                    (this._data[this._readPosition++] << 16) |
                    (this._data[this._readPosition++] << 24)) >>> 0;
            default:
                throw TypeError("Unknown data type.");
        }
    }
}