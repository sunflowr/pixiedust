import { Schema } from "@/schema";
import settingsSchema from "@/assets/schemas/settings.json";
import { BinarySerializer } from "@/BinarySerializer";

export class Settings {
    constructor(settings) {
        const schema = new Schema();
        if (typeof settings === "object") {
            if (settings instanceof Uint8Array) {
                const deserializer = new BinarySerializer(settings);
                this.magic = deserializer.deserialize("uint32");
                if (this.magic !== 0xac1dc0de) {
                    throw new Error("Unrecognized device version, this is not a RE-CPU your talking to.");
                }
                this.major = deserializer.deserialize("uint8");
                this.minor = deserializer.deserialize("uint8");
                this.patch = deserializer.deserialize("uint8");
                const version = this.major + "." + this.minor + "." + this.patch;
                const schemaVersion = schema.getSchemaVersion(settingsSchema, version);
                const entries = Object.entries(schemaVersion);
                for (let i = 4; i < entries.length; ++i) {
                    const key = entries[i][0];
                    const val = entries[i][1]
                    this[key] = deserializer.deserialize(val.type);
                }
            }
            else {
                // TODO: Transfer settings.
                Object.assign(this, schema.create(settingsSchema, settingsSchema.latest));
            }
        } else {
            Object.assign(this, schema.create(settingsSchema, settingsSchema.latest));
        }
    }
}