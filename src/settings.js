export class Settings {
    constructor(settings) {
        if (typeof settings === "object") {
            if (settings instanceof Uint8Array) {
                this.settings = null;
            }
            else {
                this.settings = null;
            }
        } else {
            this.settings = null;
        }
    }
}