import WebMidi from "webmidi";

export let _Vue;
export let midiAccess;

export function install(Vue) {
    if (install.installed && _Vue === Vue) {
        return;
    }
    install.installed = true

    _Vue = Vue

    const MIDI = new Vue({
        data() {
            return {
                enabled: false,
                webMidi: null,
                inputDevices: [],
                outputDevices: []
            }
        },
        created() {
            const that = this;
            // Start WebMIDI.
            WebMidi.enable(function (err) {
                if (err) {
                    that.onMIDIFailure();
                } else {
                    that.onMIDISuccess();
                }
            }, true);
        },
        methods: {
            onMIDISuccess() {
                this.webMidi = WebMidi;
                this.enabled = true;
                this.updateDevices();
                this.$emit("midi:initialized", "WebMIDI enabled!");
                WebMidi.addListener("connected", this.onConnected);
                WebMidi.addListener("disconnected", this.onDisconnected);
            },
            onMIDIFailure() {
                this.$emit("midi:failed", "Failed to initialize WebMIDI");
            },
            onConnected(event) {
                this.updateDevices();
                this.$emit("midi:connected", event);
            },
            onDisconnected(event) {
                this.updateDevices();
                this.$emit("midi:disconnected", event);
            },
            updateDevices() {
                // Clear device lists.
                this.inputDevices.length = 0;
                this.outputDevices.length = 0;

                if (this.enabled) {
                    // Populate input device list.
                    for (let i = 0; i < this.webMidi.inputs.length; ++i) {
                        this.inputDevices.push({
                            id: this.webMidi.inputs[i].id,
                            name: this.webMidi.inputs[i].name,
                        });
                    }

                    // Populate output device list.
                    for (let i = 0; i < this.webMidi.outputs.length; ++i) {
                        this.outputDevices.push({
                            id: this.webMidi.outputs[i].id,
                            name: this.webMidi.outputs[i].name,
                        });
                    }
                }
            },
        }
    });

    Object.defineProperty(Vue.prototype, '$MIDI', {
        get() { return MIDI; }
    });
}
