<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">
      <div>RE-CPU info</div>
      <v-spacer />
      <v-btn
        color="secondary"
        x-small
        :disabled="syncing"
        :loading="syncing"
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

export default {
  name: "DeviceInfo",
  props: {
    deviceInfo: Object,
    info: Number
  },
  data() {
    return {
      syncing: false,
      uploadStatus: "",
      receiveStatus: "",
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
  },
  beforeDestroy() {
    sysExMessages.DataResponse_Version.removeListener(this.onVersion);
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
      if (packetIndex == 0) {
        const version = new Version(data);
        if (this.info == 0) {
          this.$store.dispatch("setDeviceBootloaderVersion", version);
        } else if (this.info == 1) {
          this.$store.dispatch("setDeviceAppVersion", version);
        }
        this.syncing = false;
        this.uploadStatus = "ok";
      }
    },
    syncDeviceInfo() {
      this.syncing = true;
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.$MIDI.sendSysEx(
          this.midiOutDevice,
          [new Uint8Array([0x03, 0x03, 0x7c, (this.info & 0xff) >>> 0])],
          this.settings.uploadDelay,
          () => {},
          () => {
            setTimeout(() => {
              if (that.syncing) {
                that.receiveStatus =
                  "No RE-CPU detected, plesae check MIDI device settings and connection.";
                that.syncing = false;
              }
            }, 2000);
          },
          error => {
            that.receiveStatus = error;
            that.syncing = false;
          }
        );
      }
    }
  }
};
</script>
