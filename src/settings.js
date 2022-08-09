import { Schema } from "@/schema";
import settingsSchema from "@/assets/schemas/settings.json";
import { BinarySerializer } from "@/BinarySerializer";
import { DataTypes } from "@/datatypes";

export class Settings {
    constructor(settings) {
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
                const settings = Schema.deserialize(settingsSchema, this.getVersionString(), deserializer, 4);
                for (let i = 4; i < schemaVersion.length; ++i) {
                    const val = schemaVersion[i];
                    this[val.id] = deserializer.deserialize(DataTypes[val.type]);
                }
            }
            else {
                // TODO: Transfer settings.
                // TODO: Set version number so getSchema() works.
                const version = Schema.getVersionString(settings.versionMajor, settings.versionMinor, settings.versionPatch);
                Object.assign(this, Schema.create(settingsSchema, version));
                for(const [key, value] of Object.entries(settings)) {
                    this[key] = value;
                }
            }
        } else {
            // TODO: Set version number so getSchema() works.
            Object.assign(this, Schema.create(settingsSchema, settingsSchema.latest));
        }
    }

    getVersionString() {
        return Schema.getVersionString(this.versionMajor, this.versionMinor, this.versionPatch);
    }

    getSchema() {
        return Schema.getSchemaVersion(settingsSchema, this.getVersionString());
    }
}