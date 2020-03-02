<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">
      <div>RE-CPU info</div>
      <v-spacer />
      <v-btn
        color="secondary"
        x-small
        :disabled="syncRequest"
        :loading="syncRequest"
        @click="syncDeviceInfo"
      >
        <v-icon left>mdi-refresh</v-icon>Sync
      </v-btn>
    </v-card-title>
    <v-card-subtitle></v-card-subtitle>
    <v-card-text>
      <div v-if="receiveStatus != null && receiveStatus.length > 0">{{ receiveStatus }}</div>
      <div v-if="uploadStatus != null && uploadStatus.length > 0">{{ uploadStatus }}</div>
      <div v-if="device">
        <ul>
          <li>Bootloader Version: {{ device.bootloaderVersion.major }}.{{ device.bootloaderVersion.minor }}.{{ device.bootloaderVersion.patch }}</li>
          <li>Bootloader Name: {{ device.bootloaderVersion.name }}</li>
          <li>App Version: {{ device.appVersion.major }}.{{ device.appVersion.minor }}.{{ device.appVersion.patch }}</li>
          <li>App Name: {{ device.appVersion.name }}</li>
        </ul>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";
import { sysExMessages } from "@/SysExMessages";
import { Version } from "@/version";
import { Settings } from "@/settings";

export default {
  name: "DeviceInfo",
  props: {
    deviceInfo: Object,
    info: Number
  },
  data() {
    return {
      syncRequest: null,
      uploadStatus: "",
      receiveStatus: ""
    };
  },
  mounted() {
    /* eslint-disable no-unused-vars */
    /* eslint-disable no-console */
    this.$store.subscribeAction({
      after: (action, state) => {
        //console.log(`after action ${action.type}`);
        //console.log(state);
      }
    });
    /* eslint-enable no-console */
    /* eslint-enable no-unused-vars */
    sysExMessages.DataResponse_Version.addListener(this.onVersion);
    sysExMessages.DataResponse_Settings.addListener(this.onSettings);
  },
  beforeDestroy() {
    sysExMessages.DataResponse_Version.removeListener(this.onVersion);
    sysExMessages.DataResponse_Settings.removeListener(this.onSettings);
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    midiOutDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getOutputById(this.settings.midiOutputDevice);
      }
      return null;
    }
  },
  methods: {
    onVersion(header, packetIndex, data) {
      if (this.syncRequest && packetIndex === 0) {
        switch (this.syncRequest.receive++) {
          case 0:
            this.$store.dispatch(
              "setDeviceBootloaderVersion",
              new Version(data)
            );
            break;
          case 1:
            this.$store.dispatch("setDeviceAppVersion", new Version(data));
            break;
          default:
            this.clearSyncRequest();
            this.uploadStatus = "wtf";
            break;
        }
      }
    },
    onSettings(header, packetIndex, data) {
      if (this.syncRequest && packetIndex === 0) {
        switch (this.syncRequest.receive++) {
          case 2:
            this.$store.dispatch("setDeviceSettings", new Settings(data));
            this.clearSyncRequest();
            this.uploadStatus = "ok";
            break;
          default:
            this.clearSyncRequest();
            this.uploadStatus = "wtf";
            break;
        }
      }
    },
    onSyncTimedOut() {
      this.receiveStatus =
        "No RE-CPU detected, plesae check MIDI device settings and connection.";
      this.clearSyncRequest();
    },
    clearSyncRequest() {
      if (this.syncRequest) {
        clearTimeout(this.syncRequest.timeout);
        this.syncRequest = null;
      }
    },
    syncDeviceInfo() {
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.syncRequest = {
          tracks: [
            new Uint8Array([0x03, 0x03, 0x7c, 0x00]),
            new Uint8Array([0x03, 0x03, 0x7c, 0x01]),
            new Uint8Array([0x03, 0x03, 0x7d, 0x02])
          ],
          timeout: setTimeout(this.onSyncTimedOut, 2000),
          receive: 0
        };
        this.$MIDI.sendSysEx(
          this.midiOutDevice,
          this.syncRequest.tracks,
          this.settings.uploadDelay,
          () => {
            // Progress.
          },
          () => {
            // Resolve.
          },
          error => {
            // Reject.
            that.receiveStatus = error;
            that.clearSyncRequest();
          }
        );
      }
    }
  }
};
</script>
