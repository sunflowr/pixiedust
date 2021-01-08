import { SysExMessageDesc } from "@/SysExHandler";

// TODO: Add versioning.
export const sysExMessageDescs = {
    // Resets the application back to bootloader.
    Reset: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7f]), 7, false),
    // Uploads data.
    Upload: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e]), 0xff, false),
    // Memory dump.
    MemoryDump: new SysExMessageDesc(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7d]), 7, false),
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

