//import { checksumUtil } from '@/plugins/checksumutil';


class SysExUtil {
    /**
     * Converts a array of uint8 to nibbels, splitting each byte in to two.
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
     * Converts a array of uint8 containing nibbels by converting each parit in to a single byte.
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
     * Creates a sysex header with the specified type and package id.
     * @param {boolean} withSysExHeader If we should include the SysEx header as well
     * @param {sysExTypes} type
     * @param {number} packageId
     * @returns {Uint8Array}
     */
    makeHeader(withSysExHeader, type, packageId = undefined) {
        const header = [];

        if (withSysExHeader) {
            // SysEx start.
            header.push(0xf0);
            // Manufacturer Id - currently using the "prototyping" ID 0x7d.
            header.push(0x7d);
        }

        // Device id.
        header.push(0x03);
        header.push(0x03);

        // Command id.
        switch (type) {
            case sysExTypes.uploadBootloader:
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
            default:
                header.push(0x7f);
                break;
        }

        // Package id.
        if(packageId !== undefined)
        {
            header.push(packageId & 0xff);
        }

        return new Uint8Array(header);
    }

    /**
     * Creates a sysex footer with the specified checksum.
     * @param {boolean} withSysExHeader If we should include the SysEx footer as well
     * @param {number} dataChecksum SysEx datas checksum.
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
     * @param {number} end Length of the data to calculate checksum.
     * @returns {number}
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
     * Converts data to a array of sysex tracks.
     * @param {sysExTypes} type
     * @param {boolean} withHeaders
     * @param {number} pageSize
     * @param {Uint8Array} data
     */
    convertToSysEx(type, withHeaders, pageSize, data) {
        pageSize *= 2;

        //const checksum = checksumUtil.calculateCRC(data);
        //console.log(checksum.toString(16));

        let tracks = [];
        for (let i = 0; i < data.length; i += pageSize) {
            // Slice and padd the data.
            const dataSlice = data.slice(i, i + pageSize);
            const paddedData = new Uint8Array(dataSlice.length + (pageSize - dataSlice.length));
            paddedData.set(dataSlice);
            paddedData.fill(0x00, dataSlice.length);

            // Make track sections.
            const trackHeader = this.makeHeader(withHeaders, type, tracks.length);
            const trackData = this.nibbelize(paddedData);
            const trackFooter = this.makeFooter(withHeaders, this.calculateDataChecksum(paddedData));

            // Make track.
            const track = new Uint8Array(trackHeader.length + trackData.length + trackFooter.length);
            track.set(trackHeader)
            track.set(trackData, trackHeader.length)
            track.set(trackFooter, trackHeader.length + trackData.length);
            tracks.push(track);
        }

        // Add reset command.
        {
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
}

export const sysExTypes = {
    uploadBootloader: 0x01,
    uploadApplication: 0x02,
    uploadEmuFW: 0x03,
    test: 0x04,
    reset: 0x05
};

export let sysExUtil = new SysExUtil();
