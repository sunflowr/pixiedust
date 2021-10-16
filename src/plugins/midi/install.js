import WebMidi from "webmidi";

export let _Vue;

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
                outputDevices: [],
                uploadStatus: "",
                uploading: false,
                uploadProgress: 0
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
            // TODO: Add queuing of sysex messages.
            sendSysEx(midiOutDevice, sysExDataTracks, uploadDelay, onProgress, onResolve, onReject) {
                if (!this.uploading) {
                    this.uploading = true;
                    this.delaySendSysEx(midiOutDevice, uploadDelay, sysExDataTracks, 0, onProgress, onResolve, onReject);
                } else {
                    onReject("Busy uplading.");
                }
            },
            delaySendSysEx(midiOutDevice, delayMs, tracks, currentTrack, onProgress, onResolve, onReject) {
                const that = this;
                that.uploadProgressData = Math.trunc((currentTrack + 1)) / tracks.length;

                if (midiOutDevice && currentTrack < tracks.length) {
                    // Calculate expected upload time for track.
                    const trackTimeMS = ((tracks[currentTrack].length / (31250 / 8)) * 1000) + 10;
                    const extraTrackDelayMS = 10;
                    midiOutDevice.sendSysex(0x7d, Array.from(tracks[currentTrack]));
                    setTimeout(() => {
                        onProgress(currentTrack / tracks.length);
                        that.delaySendSysEx(midiOutDevice, delayMs, tracks, currentTrack + 1, onProgress, onResolve, onReject);
                    }, trackTimeMS + extraTrackDelayMS + delayMs);
                } else {
                    that.uploading = false;
                    if (!midiOutDevice) {
                        typeof onReject === "function" && onReject("No active midi output device, aborting!");
                    } else {
                        typeof onResolve === "function" && onResolve();
                    }
                }
            },
        }
    });

    Object.defineProperty(Vue.prototype, '$MIDI', {
        get() { return MIDI; }
    });
}
