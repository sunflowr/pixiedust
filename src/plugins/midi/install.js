import WebMidi from "webmidi";

export let _Vue;

/* eslint-disable no-unused-vars */
class SysExJob {
    /**
     * 
     * @param {Uint8Array} sysExData - SysEx data to send.
     * @param {Function} init - Optional function to call on init.
     * @param {Function} resolve - Optional function to call on resolve.
     * @param {Function} reject - Optional function to call on reject.
     * @param {Object} state - Optional internal state of job.
     */
    constructor(sysExData, init, resolve, reject, state) {
        this.sysExData = sysExData;
        this.init = sysExData;
        this.resolve = sysExData;
        this.reject = sysExData;
        this.state = state;
    }
}
/* eslint-disable no-unused-vars */

class Queue {
    constructor() {
        this._queue = [];
        this._working = false;
        this.stop = false;
    }

    /**
     * Queues a promise. Also execute it if queue is empty.
     * @param {Function} promise 
     * @returns {Promise}
     */
    queue(promise) {
        const that = this;
        return new Promise((resolve, reject) => {
            that._queue.push({
                promise: promise,
                resolve: resolve,
                reject: reject
            });
            that.dequeue();
        });
    }

    /**
     * Dequeue and execute a promise if not busy.
     */
    dequeue() {
        if(this._working) {
            return;
        }
        if(this.stop) {
            this._queue = [];
            this.stop = false;
            return;
        }
        const item = this._queue.shift();
        if(!item) {
            return;
        }
        try
        {
            const that = this;
            this._working = true;
            item.promise()
            .then(value => {
                that._working = false;
                item.resolve(value);
                that.dequeue();
            })
            .catch(err => {
                that._working = false;
                item.reject(err);
                that.dequeue();
            });
        } catch(err) {
            this._working = false;
            item.reject(err);
            this.dequeue();
        }
    }
}


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
                uploadProgress: 0,
                sysExSendQueue: new Queue()
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
            /**
             * A delayed promise.
             * @param {Number} ms - Delay time in milliseconds.
             * @returns {Promise} Promise of the delay.
             */
            delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            },
            /**
             *
             * @param {*} midiOutDevice - MIDI output device.
             * @param {Uint8Array} sysExData - SysEx data to send.
             * @param {CallableFunction} [init] - Optional initialization callback to call before sending.
             * @returns {Promise} Promise of the SysEx send.
             */
            sendSysExAsync(midiOutDevice, sysExData, init) {
                return this.sysExSendQueue.queue(() => new Promise((resolve, reject) => {
                    try
                    {
                        init?.();
                        const trackTimeMS = ((sysExData.length / (31250 / 8)) * 1000) + 10;
                        const extraTrackDelayMS = 10;
                        midiOutDevice.sendSysex(0x7d, Array.from(sysExData));
                        setTimeout(() => { resolve(); }, trackTimeMS + extraTrackDelayMS);
                    } catch(err) {
                        reject(err);
                    }
                }));
            },
            processSysExQueue() {
                this.sysExSendQueue.dequeue();
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
