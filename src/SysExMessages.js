/**
 * @module: sysexmessages
 */
//import { SysExMessageBase, SysExMessageDesc } from "@/SysExHandler";
import { SysExMessageBase } from "@/SysExHandler";
import { sysExUtil } from "@/plugins/sysexutil";
import { BinarySerializer } from "@/BinarySerializer";
import { DataTypes } from "@/datatypes";

// TODO: Remove these old notes.
// TODO: Add versioning.
// Memory dump.
// MemoryDump: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7d]), 7, false,
//     (data) => { return {
//         _dataType: data[0],
//         _data: data.slice(1)
//     }; }),
// Ping.
// Ping: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7a]), 5, false),
// Data request response version (0x7d or 0x7c is request).
// DataResponse_MemoryDump: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x03]), 0xff, true, (data) => { return { _memoryId: data[0], _data: data.slice(1) }; }),
// Pong!
// DataResponse_Ping: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x6a]), 5, false)
// Data request response version (0x7d or 0x7c is request).
// DataResponse_Settings: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x02]), 0xff, true),

/**
 * Calculate a simple uint8 checksum of the data.
 * @param {Uint16Array} data - Data to calculate checksum of.
 * @returns {Number} Simple checksum.
 */
function calculateChecksum(data) {
    let dataChecksum = 0;
    for (let j = 0; j < data.length; ++j) {
        dataChecksum = (dataChecksum + data[j]) & 0xff; // Expected to be a UInt8 value.
    }
    return dataChecksum;
}

/**
 * Verify the data's checksum against the expected checksum.
 * @param {Uint16Array} data - Data to verify.
 * @param {Number} checksum - Expected simple checksum.
 * @returns {Boolean} True if checksum match.
 */
function verifyPackagesChecksum(data, checksum) {
    return checksum === calculateChecksum(data);
}

/**
 * Verify the data's checksum against the expected checksum.
 * @param {Uint16Array} data - Data to verify.
 * @param {Number} checksum - Expected simple checksum.
 * @returns {Boolean} True if checksum match.
 */
/* eslint-disable no-unused-vars */
function verifyPackagesChecksum32(data, checksum) {
    // TODO: Fix this.
    return true;
}
/* eslint-enable no-unused-vars */

/**
 * List of recognized data types that can be uploaded/received.
 */
export const sysExUploadDataTypes = {
    bootloader: 1,          // Uploads application, requests version.
    application: 2,         // Uploads application, requests version.
    emulatorFirmware: 3,    // Uploads firmware, requests emulated syst.
    settings: 4,
    memoryDump: 5
};

/** SysEx message Reset */
export class SysExMessage_Reset extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7f]); }

    /** Creates a SysEx message */
    static makeSysEx(resetReason) {
        const serializer = new BinarySerializer(SysExMessage_Reset.headerPrefix);
        serializer.serialize(DataTypes.uint8, resetReason & 0x7f);
        serializer.serialize(DataTypes.uint8, 0xf7);
        return serializer.data;
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

/** SysEx message Ping */
export class SysExMessage_Ping extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b]); }
    static get responseHeaderPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x6b]); }

    /** Creates a SysEx message */
    static makeSysEx(pingChallenge, response = false) {
        const headerPrefix  = response ? SysExMessage_Ping.responseHeaderPrefix : SysExMessage_Ping.headerPrefix;
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
        const serializer = new BinarySerializer(SysExMessage_BeginUpload.headerPrefix);
        serializer.serialize(DataTypes.uint8, dataType & 0x7f);
        const dataSerializer = new BinarySerializer();
        dataSerializer.serialize(DataTypes.uint32, totalPackages);
        dataSerializer.serialize(DataTypes.uint32, checksum);
        dataSerializer.serialize(DataTypes.uint8, sysExUtil.calculateDataChecksum(dataSerializer.data));
        serializer.push(sysExUtil.nibbelize(dataSerializer.data));
        serializer.serialize(DataTypes.uint8, 0xf7);
        return serializer.data;
    }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_BeginUpload.headerPrefix, sysExData);
        if(sysExData.length !== 27) {
            throw new Error("Invalid begin upload message.");
        }
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._dataType = this._data[0];
        this._data = sysExUtil.denibbelize(this._data.slice(1, -1));
        const deserializer = new BinarySerializer(this._data);
        this._totalPackages = deserializer.deserialize(DataTypes.uint32);
        this._finalChecksum = deserializer.deserialize(DataTypes.uint32);
        this._checksum = deserializer.deserialize(DataTypes.uint16);
    }

    /** Returns the data type for the upload message. */
    get dataType() { return this._dataType; }
    /** Returns the expected number of packages on the upload message. */
    get totalPackages() { return this._totalPackages; }
    /** Returns the expected checksum of the fully uploaded message. */
    get checksum() { return this._finalChecksum; }

    /**
     * Takes a array of package messages to calculate total checksum of and verify it against expected checksum. 
     * @param {number} checksum - Expected checksum. 
     * @param {Uint8Array} data - Uploaded data to check. 
     */
    static verifyPackagesChecksum(checksum, data) {
        return verifyPackagesChecksum32(checksum, data);
    }
}

// TODO: Remove if not used.
// EndUpload: new SysExMessageDesc(new Uint8Array([]), 27, false),
/** SysEx message EndUpload */
export class SysExMessage_EndUpload extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e, 0x7f, 0x01]); }

    /** Creates a SysEx message */
    static makeSysEx(dataType, totalPackages, checksum) {
        const headerPrefix  = SysExMessage_EndUpload.headerPrefix;
        const sysExData = new Uint8Array(headerPrefix.length + 18);
        sysExData.set(headerPrefix);
        sysExData[headerPrefix.length] = ((dataType & 0x7f) >>> 0);
        // TODO: Remove me later and use BinarySerializer.
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
        super(SysExMessage_EndUpload.headerPrefix, sysExData);
        this.parse();
    }

    /** Parses data. Silly redirection of constructor as there seem to be some issue with extend and base fields. */
    parse() {
        this._dataType = this._data[0];
        this._totalPackages = BinarySerializer.deserialize(DataTypes.uint32, sysExUtil.denibbelize(this._data.slice(1, 9)));
        this._checksum = BinarySerializer.deserialize(DataTypes.uint32, sysExUtil.denibbelize(this._data.slice(9, 17)));
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
    static verifyPackagesChecksum(checksum, data) {
        return verifyPackagesChecksum32(checksum, data);
    }
}

/** SysEx message Upload */
export class SysExMessage_Upload extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e]); }

    /** Returns the max data size for a packet of size packetSize  */
    static calculateMaxDataSize(packetSize) {
        return (packetSize - (SysExMessage_Upload.headerPrefix.length + 4)) >>> 1;
    }

    /** Creates a SysEx message */
    static makeSysEx(dataType, packetIndex, data) {
        const serializer = new BinarySerializer(SysExMessage_Upload.headerPrefix);
        serializer.serialize(DataTypes.uint8, dataType & 0x7f);
        serializer.serialize(DataTypes.uint8, packetIndex & 0x7f);
        const dataSerializer = new BinarySerializer();
        dataSerializer.push(data);
        dataSerializer.serialize(DataTypes.uint8, sysExUtil.calculateDataChecksum(dataSerializer.data));
        serializer.push(sysExUtil.nibbelize(dataSerializer.data));
        serializer.serialize(DataTypes.uint8, 0xf7);
        return serializer.data;
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
            if(!verifyPackagesChecksum(this._data, checksum)) {
                throw new Error("Error when receiving, data is corrupt.");
            }
        }
    }

    /** Returns the data type for the upload message. */
    get dataType() { return this._dataType; }
    /** Returns the packet index for the upload message. */
    get packetIndex() { return this._packetIndex; }
}

// Data request response version (0x7d or 0x7c is request).
// DataResponse_Version: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x00]), 0xff, true),
/** SysEx message Version */
export class SysExMessage_Version extends SysExMessageBase {
    /** Returns the header prefix for the message. */
    static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7c]); }
    static get requestHeaderPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7c]); }
    //static get headerPrefix() { return new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x00]); }

    /**
     * Creates a message of type 
     * @param {Uint8Array} sysExData - Received SysEx data to process.
     */
    constructor(sysExData) {
        super(SysExMessage_Version.headerPrefix, sysExData);
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
            if(!verifyPackagesChecksum(this._data, checksum)) {
                throw new Error("Error when receiving, data is corrupt.");
            }
        }
    }

    /** Returns the data type for the upload message. */
    get dataType() { return this._dataType; }
    /** Returns the packet index for the upload message. */
    get packetIndex() { return this._packetIndex; }
}
