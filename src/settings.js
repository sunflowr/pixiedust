import { Schema } from "@/schema";
import settingsSchema from "@/assets/schemas/settings.json";
import { BinarySerializer } from "@/BinarySerializer";
import { DataTypes } from "@/datatypes";

export class Settings {
    constructor(settings) {
        const schema = new Schema();
        if (typeof settings === "object") {
            if (settings instanceof Uint8Array) {
                const deserializer = new BinarySerializer(settings);
                this.magic = deserializer.deserialize(DataTypes.uint32);
                if (this.magic !== 0xac1dc0de) {
                    throw new Error("Unrecognized device version, this is not a RE-CPU your talking to.");
                }
                this.versionMajor = deserializer.deserialize(DataTypes.uint8);
                this.versionMinor = deserializer.deserialize(DataTypes.uint8);
                this.versionPatch = deserializer.deserialize(DataTypes.uint8);
                const schemaVersion = this.getSchema();
                if (schemaVersion) {
                    const entries = Object.entries(schemaVersion);
                    for (let i = 4; i < entries.length; ++i) {
                        const key = entries[i][0];
                        const val = entries[i][1]
                        this[key] = deserializer.deserialize(DataTypes[val.type]);
                    }
                }
            }
            else {
                // TODO: Transfer settings.
                // TODO: Set version number so getSchema() works.
                Object.assign(this, schema.create(settingsSchema, settingsSchema.latest));
            }
        } else {
            // TODO: Set version number so getSchema() works.
            Object.assign(this, schema.create(settingsSchema, settingsSchema.latest));
        }
    }

    getVersionString() {
        return this.versionMajor + "." + this.versionMinor + "." + this.versionPatch;
    }

    getSchema() {
        const schema = new Schema();
        return schema.getSchemaVersion(settingsSchema, this.getVersionString());
    }
}