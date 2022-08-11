//import { checksumUtil } from '@/plugins/checksumutil';

import { DataTypes } from "@/datatypes";
import { BinarySerializer } from "../../BinarySerializer";
import { checksumUtil } from "../checksumutil";


class SysExUtil {
    /**
     * Converts an array of uint8 to nibbles, splitting each byte in to two.
     * @param {Uint8Array} data The data to convert
     * @returns {Uint8Array}
     */
    nibbelize(data) {
        let outData = new Uint8Array(data.length * 2);
        let j = 0;
        for (let i = 0; i < data.length; ++i) {
            outData[j++] = (data[i] >>> 4) & 0x0f;
            outData[j++] = data[i] & 0x0f;
        }
        return outData;
    }

    /**
     * Converts an array of uint8 containing nibbles by converting each pair in to a single byte.
     * @param {Uint8Array} data The data to convert
     * @returns {Uint8Array}
     */
    denibbelize(data) {
        let outData = new Uint8Array(data.length / 2);
        let j = 0;
        for (let i = 0; i < data.length; i += 2) {
            outData[j++] = ((data[i] << 4) | data[i + 1]) & 0xff;
        }
        return outData;
    }

    /**
     * Creates a sysex begin upload header with the specified type and package id.
     * @param {Boolean} withSysExHeader If we should include the SysEx header as well
     * @param {SysExType} type
     * @param {Number} totalPackages
     * @param {Number} finalChecksum
     * @returns {Uint8Array}
     */
     makeBeginUploadPackage(withSysExHeader, type, totalPackages, finalChecksum) {
        const header = [];

        if (withSysExHeader) {
            // SysEx start.
            header.push(0xf0);
            // Manufacturer id - currently using the "prototyping" ID 0x7d.
            header.push(0x7d);
        }

        // Device id.
        header.push(0x03);
        header.push(0x03);

        // BeginUpload Command id.
        header.push(0x7e);
        header.push(0x7f);
        header.push(0x00);

        // Data type.
        header.push(type & 0x7f);

        const serializer = new BinarySerializer();
        serializer.serialize(DataTypes.uint32rev, totalPackages);
        serializer.serialize(DataTypes.uint32rev, finalChecksum);
        serializer.serialize(DataTypes.uint8, this.calculateDataChecksum(serializer.data));
        const data = this.nibbelize(serializer.data);
        for(let d of data) {
            header.push(d);
        }

        if (withSysExHeader) {
            // SysEx stop.
            header.push(0xf7);
        }

        return new Uint8Array(header);
    }

    /**
     * Creates a sysex header with the specified type and package id.
     * @param {Boolean} withSysExHeader If we should include the SysEx header as well
     * @param {SysExType} type
     * @param {Number} packageId
     * @returns {Uint8Array}
     */
    makeHeader(withSysExHeader, type, packageId = undefined) {
        const header = [];

        if (withSysExHeader) {
            // SysEx start.
            header.push(0xf0);
            // Manufacturer id - currently using the "prototyping" ID 0x7d.
            header.push(0x7d);
        }

        // Device id.
        header.push(0x03);
        header.push(0x03);

        // Command id.
        switch (type) {
        /*case sysExTypes.uploadBootloader:
            header.push(0x7e);
            header.push(0x01);
            break;
        case sysExTypes.uploadApplication:
            header.push(0x7e);
            header.push(0x02);
            break;
        case sysExTypes.uploadEmuFW:
            header.push(0x7e);
            header.push(0x03);
            break;
        case sysExTypes.reset:
            header.push(0x7f);
            header.push(0x00);
            break;
        case sysExTypes.test:
            header.push(0x7f);
            break;*/
        default:
            header.push(0x7e);
            header.push(type & 0x7f);
            break;
        }

        // Package id.
        if (packageId !== undefined) {
            header.push(packageId & 0xff);
        }

        return new Uint8Array(header);
    }

    /**
     * Creates a sysex footer with the specified checksum.
     * @param {boolean} withSysExFooter If we should include the SysEx footer as well
     * @param {number} dataChecksum SysEx data checksum.
     * @returns {Uint8Array}
     */
    makeFooter(withSysExFooter, dataChecksum) {
        const footer = [
            ((dataChecksum >>> 4) & 0x0f),
            (dataChecksum & 0x0f),
        ];
        if (withSysExFooter) {
            // SysEx stop.
            footer.push(0xf7);
        }
        return new Uint8Array(footer);
    }

    /**
     * Calculates the checksum of a data array.
     * @param {Uint8Array} data Data to calculate checksum on.
     * @param {Number} end Length of the data to calculate checksum.
     * @returns {Number}
     */
    calculateDataChecksum(data, end = data.length) {
        //(data.length - 1)
        // Calculate checksum of data.
        let dataChecksum = 0;
        for (let j = 0; j < end; ++j) {
            dataChecksum = ((dataChecksum + data[j]) & 0xff); // Expected to be a UInt8 value.
        }
        return dataChecksum & 0xff;
    }

    /**
     * Converts data to an array of sysex tracks.
     * @param {SysExType} type
     * @param {boolean} withHeaders
     * @param {Number} packetSize
     * @param {Uint8Array} data
     * @param reset
     */
    convertToSysEx(type, withHeaders, packetSize, data, reset = true) {
        let tracks = [];
        for (let i = 0; i < data.length;) {
            const trackHeader = this.makeHeader(withHeaders, type, tracks.length);
            const dataSize = Math.min(packetSize - (trackHeader.length + 2) >>> 1, data.length - i);
            const dataSlice = data.slice(i, i + dataSize);
            const trackData = this.nibbelize(dataSlice);
            const trackFooter = this.makeFooter(withHeaders, this.calculateDataChecksum(dataSlice));

            // Make track.
            const track = new Uint8Array(trackHeader.length + trackData.length + trackFooter.length);
            track.set(trackHeader)
            track.set(trackData, trackHeader.length)
            track.set(trackFooter, trackHeader.length + trackData.length);
            tracks.push(track);

            i += dataSize;
        }

        // Add begin upload header.
        tracks.unshift(this.makeBeginUploadPackage(withHeaders, type, tracks.length, checksumUtil.calculateCRC(data)));

        // Add reset command.
        if(reset) {
            const trackResetHeader = this.makeHeader(withHeaders, sysExTypes.reset);
            const trackReset = new Uint8Array(trackResetHeader.length + (withHeaders ? 1 : 0));
            trackReset.set(trackResetHeader)
            if (withHeaders) {
                trackReset.set([0xf7], trackResetHeader.length)
            }
            tracks.push(trackReset);
        }

        return tracks;
    }

    /**
     * Verifies that data contains a SysEx message.
     * @param {Uint8Array} data 
     */
    isSysEx(data) {
        // Verify that this file contains sysex data.
        return data && (data[0] !== 0xf0) && (data[data.length - 1] !== 0xf7);

    }
}

/**
 * @typedef {Number} SysExType
 */

export const sysExTypes = {
    /** @type {SysExType} */
    uploadBootloader: 0x01,
    /** @type {SysExType} */
    uploadApplication: 0x02,
    /** @type {SysExType} */
    uploadEmuFW: 0x03,
    /** @type {SysExType} */
    test: 0x04,
    /** @type {SysExType} */
    reset: 0x05
};

export let sysExUtil = new SysExUtil();
