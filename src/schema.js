export class Schema {
    constructor() {
    }

    create(schema, version){
        if(schema && (typeof schema === "object")){
            for(let i = 0; i < schema["versions"].length; ++i){
                const obj = schema[i];
                if(obj["version"] === version){
                    // TODO: CREATE.
                    return;
                }
            }
            throw new Error("Uknown schema version");
        }
        throw new Error("Unkown schema.");
    }
}