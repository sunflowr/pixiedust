export class BinarySerializer {
    constructor(data) {
        this._data = data;
        this._readPosition = 0;
        this._types = {
            "bool": {
                "size": 1,
                "type": "boolean",
                "deserialize": () => {
                    const value = ((this._data[this._readPosition++] >>> 0) !== 0)
                    return value;
                }
            },
            "string24": {
                "size": 24,
                "type": "string",
                "deserialize": () => {
                    const value = new TextDecoder("utf-8").decode(this._data.slice(this._readPosition, this._readPosition + 24));
                    this._readPosition += 24;
                    return value;
                }
            },
            "uint8": {
                "size": 1,
                "type": "number",
                "deserialize": () => {
                    const value = (this._data[this._readPosition++]) >>> 0;
                    return value;
                }
            },
            "uint16": {
                "size": 2,
                "type": "number",
                "deserialize": () => {
                    const value = (this._data[this._readPosition++] |
                        (this._data[this._readPosition++] << 8)) >>> 0;
                        return value;
                    }
            },
            "uint32": {
                "size": 4,
                "type": "number",
                "deserialize": () => {
                    const value = (this._data[this._readPosition++] |
                        (this._data[this._readPosition++] << 8) |
                        (this._data[this._readPosition++] << 16) |
                        (this._data[this._readPosition++] << 24)) >>> 0;
                        return value;
                    }
            }
        };
    }

    deserialize(type) {
        return this._types[type].deserialize(this);

    }
}