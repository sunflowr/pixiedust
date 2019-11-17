export let _Vue;
export let midiAccess;

export function install(Vue) {
    if (install.installed && _Vue === Vue) {
        return;
    }
    install.installed = true

    _Vue = Vue

    const Settings = new Vue({
        data() {
            return {
                midiInputDevice: null,
                midiOutputDevice: null,
                midiPort: 1,
                uploadDelay: 250
            }
        },
    });

    Object.defineProperty(Vue.prototype, '$Settings', {
        get() { return Settings; }
    });
}
