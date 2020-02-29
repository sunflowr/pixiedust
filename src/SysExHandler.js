import { sysExUtil } from "@/plugins/sysexutil";

function compareArrays(a, b) {
    if (a === b) { return true; }
    if ((a == null) || (b == null)) { return false; }
    if (a.length !== b.length) { return false; }
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false; }
    }
    return true;
}

export class SysExMessage {
    constructor(prefix, size, hasPacketIndex) {
        this.messagePrefix = prefix;
        this.messageSize = size;
        this.hasPacketIndex = hasPacketIndex;
        this.listeners = [];
    }

    addListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        this.listeners.push(listener);
    }

    removeListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError("The listener must be a function.");
        }
        const i = this.listeners.indexOf(listener);
        if (i >= 0) {
            this.listeners.splice(i, 1);
        }
    }

    dispatch(header, packetIndex, data){
        for(let i = 0; i < this.listeners.length; ++i){
            this.listeners[i](header, packetIndex, data);
        }
    }
}

class SysExHandler {
    constructor() {
    }

    onSysEx(sysExMessage, sysExMessages) {
        /* eslint-disable no-console */
        //console.log(sysExMessage);
        const message = Object.values(sysExMessages).find(x => compareArrays(x.messagePrefix, sysExMessage.slice(0, x.messagePrefix.length)));
        if (message !== undefined) {
            let headerSize = message.messageSize !== 0xff ? message.messageSize : message.messagePrefix.length;
            const header = sysExMessage.slice(0, headerSize);
            let packetIndex = 0;
            if (message.hasPacketIndex) {
                packetIndex = sysExMessage[headerSize];
                headerSize++;
            }
            const sdata = sysExMessage.slice(headerSize, -1);
            if (sdata.length % 2 !== 0) {
                throw new Error("SysEx data length is uneven, the received data is most likely corrupt.");
            }

            //console.log(message);
            //console.log(packetIndex);
            //console.log(sdata);

            let data = sysExUtil.denibbelize(sdata);
            if (data.length > 1) {
                const checksum = data[data.length - 1];
                data = data.slice(0, -1);

                // Verify data using checksum.
                let dataChecksum = 0;
                for (let j = 0; j < data.length; ++j) {
                    dataChecksum = (dataChecksum + data[j]) & 0xff; // Expected to be a UInt8 value.
                }

                if (checksum !== dataChecksum) {
                    throw new Error("Error when reciving, data is corrupt.");
                }
            }
            if ((data.length > 1) || (packetIndex === 0)) {
                message.dispatch(header, packetIndex, data);
            }
        }
        /* eslint-enable no-console */
    }
}

const sysExHandler = new SysExHandler();

export default sysExHandler;