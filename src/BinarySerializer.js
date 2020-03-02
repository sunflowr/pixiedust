import { DataTypes } from "@/datatypes";

export class BinarySerializer {
    constructor(data) {
        this._data = data;
        this._readPosition = 0;
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