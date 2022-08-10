import { DataTypes } from "@/datatypes";
import { BinarySerializer } from "@/BinarySerializer";

export class Schema {
    constructor() {
    }

    static _sizeOf(schemaVersion) {
        let size = 0;
        for (let i = 0; i < schemaVersion.length; ++i) {
            size += DataTypes[schemaVersion[i]].size;
        }
        return size;
    }

    /**
     * Finds the latest version string for a schema.
     * @param {Object} schema - Object containing all schema versions
     * @returns {String} - The latest version in the schema.
     */
    static getLatestSchemaVersionString(schema) {
        if (schema && (typeof schema === "object")) {
            const schemaVersion = schema["latest"];
            if (schemaVersion) {
                return schemaVersion;
            }
            throw new Error("No latest schema version found.");
        }
        throw new Error("Unknown schema.");
    }

    /**
     * Retrieves a specified version of a schema.
     * @param {Object} schema - Object containing all schema versions.
     * @param {String }version - Version we are interested in.
     * @returns {Object} - The requested version of the schema.
     */
    static getSchemaVersion(schema, version) {
        if (schema && (typeof schema === "object")) {
            const schemaVersion = schema["versions"][version];
            if (schemaVersion) {
                return schemaVersion;
            }
            throw new Error("Unknown schema version");
        }
        throw new Error("Unknown schema.");
    }

    /**
     * Finds the latest version string for a schema.
     * @param {Object} schema - Object containing all schema versions
     * @returns {Object} - The latest version of the schema.
     */
    static getLatestSchemaVersion(schema) {
        return Schema.getSchemaVersion(schema, Schema.getLatestSchemaVersionString(schema));
    }

    /**
     * Create a new instance of a schema object using specified version.
     * @param {Object} schema - JSON schema.
     * @param {String} version - Semantic version of the schema (MAJOR.MINOR.PATCH)
     * @returns {Object} A instance of the specified version of a schema using expected or default values.
     */
    static create(schema, version) {
        const schemaVersion = Schema.getSchemaVersion(schema, version);
        const obj = {};
        for (let i = 0; i < schemaVersion.length; ++i) {
            const val = schemaVersion[i];
            obj[val.id] = val.expected ?? val.default;
        }
        return obj;
    }

    /**
     * Takes an object (data) and serialized it into a Uint8Array.
     * @param {Object} schema - JSON based schema.
     * @param {String} version - Version of the schema to use.
     * @param {Object} data - Data to serialize.
     * @returns {Uint8Array} - The serialized data.
     */
    static serialize(schema, version, data) {
        const schemaVersion = Schema.getSchemaVersion(schema, version);
        const serializer = new BinarySerializer();
        for (let i = 0; i < schemaVersion.length; ++i) {
            const val = schemaVersion[i];
            serializer.serialize(DataTypes[val.type], data[val.id]);
        }
        /*for(const [key, value] of Object.entries(schemaVersion)) {
            DataTypes[schemaVersion[key].type].size;
            data[key]
            key
            this[key] = value;
        }*/
        return serializer.data;
    }

    /**
     * Takes an array of data and deserialize it into an Object.
     * @param {Object} schema - JSON based schema.
     * @param {String} version - Version of the schema to use.
     * @param {Array|BinarySerializer} data - Data to deserialize or deserializer.
     * @param {Number} [startElement] - Optional start element in schema.
     * @returns {Object} - The deserialized object.
     */
    static deserialize(schema, version, data, startElement) {
        const schemaVersion = Schema.getSchemaVersion(schema, version);
        const deserializer = typeof data === "object" && data instanceof BinarySerializer ? data : new BinarySerializer(data);
        const obj = {};
        for (let i = startElement ?? 0; i < schemaVersion.length; ++i) {
            const val = schemaVersion[i];
            obj[val.id] = deserializer.deserialize(DataTypes[val.type]);
        }
        return obj;
    }

    /**
     * Takes a semantic version in the form of three numbers and convert it to a string.
     * @param {Number|Object} major Major version number or an object containing properties versionMajor, versionMinor and versionPatch.
     * @param {Number} [minor] Minor version number.
     * @param {Number} [patch] Patch version number.
     * @returns {string} The converted string.
     */
    static getVersionString(major, minor, patch) {
        if (typeof major === "object") {
            minor = major.versionMinor ?? 0;
            patch = major.versionPatch ?? 0;
            major = major.versionMajor ?? 0;
        }
        return major + "." + minor + "." + patch;
    }
}