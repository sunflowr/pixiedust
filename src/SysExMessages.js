import { SysExMessage } from "@/SysExHandler";

export const sysExMessages = {
    // Resets the application back to bootloader.
    Reset: new SysExMessage(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7f]), 7, false),
    // Uploads data.
    Upload: new SysExMessage(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7e]), 0xff, false),
    // Memory dump.
    MemoryDump: new SysExMessage(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7d]), 7, false),
    // Data request response version (0x7d or 0x7c is request).
    DataResponse_Version: new SysExMessage(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x00]), 0xff, true),
    // Data request response version (0x7d or 0x7c is request).
    DataResponse_Settings: new SysExMessage(new Uint8Array([0xf0, 0x7d, 0x03, 0x03, 0x7b, 0x02]), 0xff, true)
};

