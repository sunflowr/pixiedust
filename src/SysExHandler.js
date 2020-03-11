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

export class SysExMessageDesc {
    constructor(prefix, size, hasPacketIndex, onData) {
        this._messagePrefix = prefix;
        this._messageSize = size;
        this._hasPacketIndex = hasPacketIndex;
        this._onData = onData;
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

        // Process any extra data in the message header.
        const extraData = Object.entries(this._desc.OnData(this._data));
        for (let i = 0; i < extraData.length; ++i) {
            const key = extraData[i][0];
            const val = extraData[i][1];
            this[key] = val;
        }
        // Read packet index.
        this._packetIndex = 0;
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
                throw new Error("Error when reciving, data is corrupt.");
            }
        }

        // Is this last message?
        if (this._desc.messageSize === 0xff) {
            this._isLastMessage = this._data.length === 0;
        }
        else {
            this._isLastMessage = data.length === this._desc.messageSize;
            // TODO: Verify this is working as intended.
            /* eslint-disable no-console */
            console.log("last message false:");
            if (this._isLastMessage) {
                console.log("last message false");
            }
            console.log(this._data);
            /* eslint-enable no-console */
        }
    }

    get desc() {
        return this._desc;
    }

    get data() {
        return this._data;
    }

    get isLastMessage() {
        return this._isLastMessage;
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
        this._packetIndex = message._packetIndex;
        this._isLastMessage = message.isLastMessage;
    }
}

class SysExHandler {
    constructor() {
    }

    onSysEx(sysExMessage, sysExMessageDescs) {
        const messageDesc = Object.values(sysExMessageDescs).find(x => compareArrays(x.messagePrefix, sysExMessage.slice(0, x.messagePrefix.length)));
        if (messageDesc) {
            const message = new SysExMessage(messageDesc, sysExMessage);
            if (message._packetIndex > 0) {
                if (!this._currentMessage) {
                    throw new Error("SysEx message received in wrong order.")
                }
                else if (message.desc !== this._currentMessage.desc) {
                    throw new Error("Received a new SysEx message while already busy processing another message.")
                }
                this._currentMessage.appendMessage(message);
            } else if (this._currentMessage) {
                throw new Error("Received a new SysEx message while already busy processing another message.")
            } else {
                this._currentMessage = message;
            }
            if (this._currentMessage.isLastMessage) {
                messageDesc.dispatch(this._currentMessage);
                delete this._currentMessage;
            }
        }
    }
}

const sysExHandler = new SysExHandler();

export default sysExHandler;