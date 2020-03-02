import { DataTypes } from "@/datatypes";

export class Schema {
    constructor() {
    }

    _sizeOf(schemaVersion) {
        let size = 0;
        const values = Object.values(schemaVersion.values);
        for (let i = 0; i < values.length; ++i) {
            size += DataTypes[values[i]].size;
        }
        return size;
    }

    getSchemaVersion(schema, version) {
        if (schema && (typeof schema === "object")) {
            const schemaVersion = schema["versions"][version];
            if (schemaVersion) {
                return schemaVersion;
            }
            throw new Error("Unknown schema version");
        }
        throw new Error("Unknown schema.");
    }

    create(schema, version) {
        if (schema && (typeof schema === "object")) {
            const schemaVersion = schema["versions"][version];
            if (schemaVersion) {
                const obj = {};
                const entries = Object.entries(schemaVersion);
                for (let i = 0; i < entries.length; ++i) {
                    const key = entries[i][0];
                    const val = entries[i][1]
                    obj[key] = val.default;
                }
                return obj;
            }
            throw new Error("Unknown schema version");
        }
        throw new Error("Unknown schema.");
    }
}