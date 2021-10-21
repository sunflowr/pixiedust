import { sysExUtil } from "@/plugins/sysexutil";

function compareArrays(a, b) {
    if (a === b) { return true; }
    if ((!a) || (!b)) { return false; }
    if (a.length !== b.length) { return false; }
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false; }
    }
    return true;
}

export class SysExMessageBase {
    /**
     * 
     * @param {Uint8Array} headerPrefix - SysEx message header prefix.
     * @param {Uint8Array} sysExData - SysEx data for the message to parse.
     */
    constructor(headerPrefix, sysExData) {
        this.parseBase(headerPrefix, sysExData);
    }

    /**
     * Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields.
     * @param {Uint8Array} headerPrefix - SysEx message header prefix.
     * @param {Uint8Array} sysExData - SysEx data for the message to parse.
     */
    parseBase(headerPrefix, sysExData) {
        // Assign header and data.
        this._headerPrefix = headerPrefix;
        this._sysExData = sysExData;
        this._header = sysExData.slice(0, this._headerPrefix.length);
        this._data = sysExData.slice(this._header.length, -1);
    }

    /** Returns the SysEx header. */
    get header() { return this._header; }
    /** Returns the data of the message. */
    get data() { return this._data; }

    // TODO: Remove me later and use BinarySerializer.
    /** Converts a uint16 value to a uint8 array.
     * 
     * @param {Number} uint16value - Value to convert.
     * @returns {Uint8Array} A uint8 array.
    */
    static uint16ToUint8Array(uint16value) {
        const val = new Uint8Array(2);
        val[0]= ((uint16value >> 8) & 0xff) >>> 0;
        val[1]= ((uint16value >> 0) & 0xff) >>> 0;
        return val;
    }

    // TODO: Remove me later and use BinarySerializer.
    /** Converts a uint32 value to a uint8 array.
     * 
     * @param {Number} uint32value - Value to convert.
     * @returns {Uint8Array} A uint8 array.
    */
    static uint32ToUint8Array(uint32value) {
        const val = new Uint8Array(4);
        val[0]= ((uint32value >> 24) & 0xff) >>> 0;
        val[1]= ((uint32value >> 16) & 0xff) >>> 0;
        val[2]= ((uint32value >> 8) & 0xff) >>> 0;
        val[3]= ((uint32value >> 0) & 0xff) >>> 0;
        return val;
    }
}

export class SysExMessageDesc {
    constructor(prefix, size, hasPacketIndex, onData, onIsLastMessage, onIsValid) {
        this._messagePrefix = prefix;
        this._messageSize = size;
        this._hasPacketIndex = hasPacketIndex;
        this._onData = onData;
        this._onIsLastMessage = onIsLastMessage;
        this._onIsValid = onIsValid;
        this._listeners = [];
    }

    get messagePrefix() {
        return this._messagePrefix;
    }

    get messageSize() {
        return this._messageSize;
    }

    get hasPacketIndex() {
        return this._hasPacketIndex;
    }

    IsLastMessage(sysExMessage) {
        if(this._onIsLastMessage) {
            return this._onIsLastMessage(sysExMessage);
        }
        return false;
    }

    IsValid(sysExMessage) {
        if(this._onIsValid) {
            return this._onIsValid(sysExMessage);
        }
        return true;
    }

    OnData(data) {
        if (this._onData) {
            return this._onData(data);
        }
        return {};
    }

    addListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        this._listeners.push(listener);
    }

    removeListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        const i = this._listeners.indexOf(listener);
        if (i >= 0) {
            this._listeners.splice(i, 1);
        }
    }

    dispatch(message) {
        for (let i = 0; i < this._listeners.length; ++i) {
            this._listeners[i](message);
        }
    }
}

export class SysExMessage {
    constructor(desc, data) {
        this._desc = desc;

        // Assign header and data.
        const headerSize = (this._desc.messageSize !== 0xff) ? this._desc.messageSize : this._desc.messagePrefix.length;
        this._header = data.slice(0, headerSize);
        this._data = data.slice(headerSize, -1);
        this._packetIndex = 0;

        // Process any extra data in the message header.
        const extraData = Object.entries(this._desc.OnData(this._data));
        for (let i = 0; i < extraData.length; ++i) {
            const key = extraData[i][0];
            const val = extraData[i][1];
            this[key] = val;
        }
        // Read packet index.
        if (this._desc.hasPacketIndex) {
            this._packetIndex = this._data[0];
            this._data = this._data.slice(1);
        }

        // Denibbelize.
        if (this._data.length % 2 !== 0) {
            throw new Error("SysEx data length is uneven, the received data is most likely corrupt.");
        }
        this._data = sysExUtil.denibbelize(this._data);
        if (this._data.length > 0) {
            const checksum = this._data[this._data.length - 1];
            this._data = this._data.slice(0, -1);

            // Verify data using checksum.
            let dataChecksum = 0;
            for (let j = 0; j < this._data.length; ++j) {
                dataChecksum = (dataChecksum + this._data[j]) & 0xff; // Expected to be a UInt8 value.
            }

            if (checksum !== dataChecksum) {
                throw new Error("Error when receiving, data is corrupt.");
            }
        }
    }

    get desc() {
        return this._desc;
    }

    get header() {
        return this._header;
    }

    get data() {
        return this._data;
    }

    get packetIndex() {
        return this._packetIndex;
    }

    get isLastMessage() {
        // Is this last message?
        if(this._desc.IsLastMessage(this)) {
            return true;
        }
        if (this._desc.messageSize === 0xff) {
            return this._data.length === 0;
        }
        // TODO: Verify this is working as intended.
        /* eslint-disable no-console */
        console.log("last message false:");
        /*if (this._isLastMessage) {
            console.log("last message false");
        }
        console.log(this._data);*/
        /* eslint-enable no-console */
        return this._data.length === this._desc.messageSize;
    }

    get isValid() {
        //if(this._desc.IsValid(this)) {
        //    return true;
        //}
        return true;
    }

    appendMessage(message) {
        if (message._desc !== this._desc) {
            throw new Error("Received a new SysEx message while already busy processing another message.")
        }
        else if (message._packetIndex !== ((this._packetIndex + 1) & 0x7f)) {
            throw new Error("SysEx message received in wrong order.")
        }

        const tmp = new Uint8Array(this._data.length + message.data.length);
        tmp.set(this._data);
        tmp.set(message.data, this._data.length);
        this._data = tmp;
        this._packetIndex = message.packetIndex;
    }
}

class SysExHandler {
    /**
     * @callback sysExMessageCallback
     */
     constructor() {
        this._listeners = new Array();
    }

    /**
     * Add a sysex message listener.
     * @param {Uint8Array} sysExHeaderPrefix - SysEx header prefix to listen at.
     * @param {sysExMessageCallback} listener - Listener to call on message.
     */
    addListener(sysExHeaderPrefix, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        let index =this._listeners.findIndex(x => compareArrays(x.headerPrefix, sysExHeaderPrefix));
        if(index < 0) {
            this._listeners.push({
                headerPrefix: sysExHeaderPrefix,
                listeners: new Array()
            });
            index = this._listeners.length - 1;
        }
        this._listeners[index].listeners.push(listener);
    }

    /**
     * Removes a listener.
     * @param {sysExMessageCallback} listener - SysEx message listener to remove.
     */
    removeListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        for(const x of this._listeners) {
            const index = x.listeners.indexOf(listener);
            if(index >= 0) {
                x.listeners.splice(index, 1);
            }
        }
    }

    onSysEx(sysExMessage) {
        const listener = this._listeners.find(x => compareArrays(x.headerPrefix, sysExMessage.slice(0, x.headerPrefix.length)));
        if(listener) {
            for(let i = 0; i < listener.listeners.length; ++i) {
                listener.listeners[i](sysExMessage);
            }
            /*for(const x of listener.listeners) {
                x(sysExMessage);
            }*/
        }
//        const messageDesc = Object.values(sysExMessageDescs).find(x => compareArrays(x.messagePrefix, sysExMessage.slice(0, x.messagePrefix.length)));
//        if (messageDesc) {
//            const message = new SysExMessage(messageDesc, sysExMessage);
//            if(this._currentMessage) {
//                /*if (message.desc !== this._currentMessage.desc) {
//                    throw new Error("Received a new SysEx message while already busy processing another message.")
//                }*/
//                if(message.packetIndex !== (this._currentMessage.packetIndex + 1)) {
//                    throw new Error("SysEx message received in wrong order.")
//                }
//                this._currentMessage.appendMessage(message);
//            } else {
//                this._currentMessage = message;
//            }
//            /*if (message.packetIndex > 0) {
//                if (!this._currentMessage) {
//                    throw new Error("SysEx message received in wrong order.")
//                }
//                else if (message.desc !== this._currentMessage.desc) {
//                    throw new Error("Received a new SysEx message while already busy processing another message.")
//                }
//                this._currentMessage.appendMessage(message);
//            } else if (this._currentMessage) {
//                throw new Error("Received a new SysEx message while already busy processing another message.")
//            } else {
//                this._currentMessage = message;
//                //if(message === )
//            }*/
//            if (this._currentMessage.isLastMessage) {
//                messageDesc.dispatch(this._currentMessage);
//                delete this._currentMessage;
//            }
//        }
    }
}

const sysExHandler = new SysExHandler();

export default sysExHandler;