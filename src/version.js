import { BinarySerializer } from "@/BinarySerializer";

export class Version {
    constructor(version) {
        if (typeof version === "object") {
            if (version instanceof Uint8Array) {
                const deserializer = new BinarySerializer(version);
                this.magic = deserializer.deserialize("uint32");
                if (this.magic !== 0xac1dca78) {
                    throw new Error("Unrecognized device version, this is not a RE-CPU your talking to.");
                }
                this.hardwareId = deserializer.deserialize("uint32");
                this.name = deserializer.deserialize("string24");
                this.major = deserializer.deserialize("uint8");
                this.minor = deserializer.deserialize("uint8");
                this.patch = deserializer.deserialize("uint8");
                this.revision = deserializer.deserialize("uint16");
            } else {
                this.magic = version.magic || 0xac1dca78;
                this.hardwareId = version.hardwareId || 0xac1d0100;
                this.name = version.name || "<noname>";
                this.major = version.major || 0;
                this.minor = version.minor || 0;
                this.patch = version.patch || 0;
                this.revision = version.revision || 0;
            }
        } else {
            this.magic = 0xac1dca78;
            this.hardwareId = 0;
            this.name = "<noname>";
            this.major = 0;
            this.minor = 0;
            this.patch = 0;
            this.revision = 0;
        }
    }
}