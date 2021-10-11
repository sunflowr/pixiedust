/**
 * @module: sysexmessages
 */
import { SysExMessageBase, SysExMessageDesc } from "@/SysExHandler";
import { sysExUtil } from "@/plugins/sysexutil";

/** SysEx message Reset */
export class SysExMessage_Reset extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7f]); }

    /** Creates a SysEx message */
    static makeSysEx(resetReason) {
        const headerPrefix  = SysExMessage_Reset.headerPrefix;
        const sysExData = new Uint8Array(headerPrefix.length + 2);
        sysExData.set(headerPrefix);
        sysExData[headerPrefix.length] = ((resetReason & 0x7f) >>> 0);
        sysExData[sysExData.length - 1] = (0xf7 >>> 0);
        return sysExData;
    }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_Reset.headerPrefix, sysExData);
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._resetReason = this._data[0];
        this._data = this._data.slice(1);
    }

    /** Returns the reason for resetting. */
    get resetReason() { return this._resetReason; }
}

/** SysEx message Reset */
export class SysExMessage_Ping extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7a]); }

    /** Creates a SysEx message */
    static makeSysEx(pingChallenge) {
        const headerPrefix  = SysExMessage_Ping.headerPrefix;
        const sysExData = new Uint8Array(headerPrefix.length + 2);
        sysExData.set(headerPrefix);
        sysExData[headerPrefix.length] = ((pingChallenge & 0x7f) >>> 0);
        sysExData[sysExData.length - 1] = (0xf7 >>> 0);
        return sysExData;
    }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_Ping.headerPrefix, sysExData);
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._pingChallenge = this._data[0];
        this._data = this._data.slice(1);
    }

    /** Returns the reason for resetting. */
    get pingChallenge() { return this._pingChallenge; }
}

/** SysEx message BeginUpload */
export class SysExMessage_BeginUpload extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e, 0x7f, 0x00]); }

    /** Creates a SysEx message */
    static makeSysEx(dataType, totalPackages, checksum) {
        const headerPrefix  = SysExMessage_BeginUpload.headerPrefix;
        const sysExData = new Uint8Array(headerPrefix.length + 18);
        sysExData.set(headerPrefix);
        sysExData[headerPrefix.length] = ((dataType & 0x7f) >>> 0);
        sysExData.set(sysExUtil.nibbelize(SysExMessageBase.uint32ToUint8Array(totalPackages)), headerPrefix.length + 1);
        sysExData.set(sysExUtil.nibbelize(SysExMessageBase.uint32ToUint8Array(checksum)), headerPrefix.length + 9);
        sysExData[sysExData.length - 1] = (0xf7 >>> 0);
        return sysExData;
    }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_BeginUpload.headerPrefix, sysExData);
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._dataType = this._data[0];
        this._totalPackages = SysExMessageBase.toUint32(sysExUtil.denibbelize(this._data.slice(1, 9)));
        this._checksum = SysExMessageBase.toUint32(sysExUtil.denibbelize(this._data.slice(9, 17)));
        this._data = this._data.slice(1);
    }

    /** Returns the data type for the upload message. */
    get dataType() { return this._dataType; }
    /** Returns the expected number of packages on the upload message. */
    get totalPackages() { return this._totalPackages; }
    /** Returns the expected checksum of the fully uploaded message. */
    get checksum() { return this._checksum; }

    /**
     * Takes a array of package messages to calculate total checksum of and verify it against expected checksum. 
     * @param {number} checksum - Expected checksum. 
     * @param {Uint8Array} data - Uploaded data to check. 
     */
    /* eslint-disable no-unused-vars */
    static verifyPackagesChecksum(checksum, data) {
        // TODO: Fix this.
        return true;
    }
    /* eslint-enable no-unused-vars */
}

/** SysEx message BeginUpload */
export class SysExMessage_Upload extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e]); }
    static get dataTypes() {
        return {
            bootloader: 1,
            application: 2,
            emulatorFirmware: 3,
            settings: 4,
            memoryDump: 5
        };
    }

    /** Creates a SysEx message */
    static makeSysEx(dataType, packetIndex, data) {
        const headerPrefix  = SysExMessage_Upload.headerPrefix;
        const sysExData = new Uint8Array(headerPrefix.length + 4 + (data.length * 2));
        sysExData.set(headerPrefix);
        sysExData[headerPrefix.length] = ((dataType & 0x7f) >>> 0);
        sysExData[headerPrefix.length + 1] = ((packetIndex & 0x7f) >>> 0);
        sysExData.set(sysExUtil.nibbelize(data), headerPrefix.length + 2);
        // TODO: Checksum.
        sysExData[sysExData.length - 2] = (0 >>> 0);
        sysExData[sysExData.length - 1] = (0xf7 >>> 0);
        return sysExData;
    }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_Upload.headerPrefix, sysExData);
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._dataType = this._data[0];
        this._packetIndex = this._data[1];
        this._data = this._data.slice(2);

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

    /** Returns the data type for the upload message. */
    get dataType() { return this._dataType; }
    /** Returns the packet index for the upload message. */
    get packetIndex() { return this._packetIndex; }
}

// TODO: Add versioning.
export const sysExMessageDescs = {
    // End upload.
    EndUpload: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e, 0x7f, 0x01]), 27, false),
    // Memory dump.
    MemoryDump: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7d]), 7, false,
        (data) => { return {
            _dataType: data[0],
            _data: data.slice(1)
        }; }),
    // Ping.
    Ping: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7a]), 5, false),
    // Data request response version (0x7d or 0x7c is request).
    DataResponse_Version: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x00]), 0xff, true),
    // Data request response version (0x7d or 0x7c is request).
    DataResponse_Settings: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x02]), 0xff, true),
    // Data request response version (0x7d or 0x7c is request).
    DataResponse_MemoryDump: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x03]), 0xff, true, (data) => { return { _memoryId: data[0], _data: data.slice(1) }; }),
    // Pong!
    DataResponse_Ping: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x6a]), 5, false)
};

