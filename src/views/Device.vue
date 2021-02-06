<template>
  <v-container fluid>
    <v-app-bar-nav-icon @click.stop="false"></v-app-bar-nav-icon>
    <DeviceNav
      :device="device"
      :syncRequest="syncRequest"
      :backupFiles="backupFiles"
      @device:sync="syncDeviceInfo"
    />

    <v-container fluid>
      <router-view />
    </v-container>
  </v-container>
</template>

<script>
import DeviceNav from "@/components/DeviceNav.vue";
import { mapGetters } from "vuex";
import { sysExMessageDescs } from "@/SysExMessages";
import { Version } from "@/version";
import { Settings } from "@/settings";

export default {
  name: "Device",
  components: {
    DeviceNav,
  },
  data() {
    return {
      syncRequest: null,
      receiveStatus: "",
      pinger: null,
    };
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    ...mapGetters(["backupFiles"]),
    midiInDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getInputById(this.settings.midiInputDevice);
      }
      return null;
    },
    midiOutDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getOutputById(this.settings.midiOutputDevice);
      }
      return null;
    },
  },
  mounted() {
    sysExMessageDescs.DataResponse_Version.addListener(this.onVersion);
    sysExMessageDescs.DataResponse_Settings.addListener(this.onSettings);
    sysExMessageDescs.DataResponse_MemoryDump.addListener(this.onMemoryDump);
  },
  beforeDestroy() {
    sysExMessageDescs.DataResponse_Version.removeListener(this.onVersion);
    sysExMessageDescs.DataResponse_Settings.removeListener(this.onSettings);
    sysExMessageDescs.DataResponse_MemoryDump.removeListener(this.onMemoryDump);
  },
  methods: {
    onVersion(message) {
      if (this.syncRequest) {
        switch (this.syncRequest.receive++) {
          case 0:
            this.$store.dispatch(
              "setDeviceBootloaderVersion",
              new Version(message.data)
            );
            break;
          case 1:
            this.$store.dispatch(
              "setDeviceAppVersion",
              new Version(message.data)
            );
            break;
          default:
            this.clearSyncRequest();
            break;
        }
      }
    },
    onSettings(message) {
      if (this.syncRequest) {
        switch (this.syncRequest.receive++) {
          case 2:
            this.$store.dispatch(
              "setDeviceSettings",
              new Settings(message.data)
            );
            this.clearSyncRequest();
            break;
          default:
            this.clearSyncRequest();
            break;
        }
      }
    },
    onMemoryDump(message) {
      /* eslint-disable no-console */
      console.log("memory dump:");
      console.log(message.data);
      /* eslint-enable no-console */
      this.$store.dispatch("addBackupFile", {
        name: `Backup ${this.backupFiles.length}`,
        data: Array.from(message.data), // Need to be vanilla array due to localstorage.
      });
    },
    makeSyncRequest(sysExTracks, timeoutMS) {
      if (this.syncRequest) {
        return;
      }
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.syncRequest = {
          tracks: sysExTracks,
          timeout: setTimeout(this.onSyncTimedOut, timeoutMS),
          receive: 0,
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
          (error) => {
            // Reject.
            that.receiveStatus = error;
            that.clearSyncRequest();
          }
        );
      }
    },
    onSyncTimedOut() {
      if (this.syncRequest) {
        this.receiveStatus =
          "No RE-CPU detected, plesae check MIDI device settings and connection.";
      }
      this.clearSyncRequest();
    },
    clearSyncRequest() {
      if (this.syncRequest) {
        clearTimeout(this.syncRequest.timeout);
        this.syncRequest = null;
      }
    },
    syncDeviceInfo() {
      this.$store.dispatch("clearDevice");
      this.makeSyncRequest(
        [
          new Uint8Array([0x03, 0x03, 0x7c, 0x00]), // Bootloader version.
          new Uint8Array([0x03, 0x03, 0x7c, 0x01]), // Application version.
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]), // Settings.
        ],
        2000
      );
    },
    syncSettings() {
      if (!this.device) {
        return;
      }
      this.makeSyncRequest(
        [
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]), // Settings.
        ],
        2000
      );
    },
    startPing() {
      if (!this.pinger) {
        const that = this;

        this.pinger = setInterval(() => {
          // Ping.
          this.$MIDI.sendSysEx(
            this.midiOutDevice,
            [new Uint8Array([0x03, 0x03, 0x7a])],
            2000,
            () => {
              // Progress.
            },
            () => {
              // Resolve.
            },
            (error) => {
              // Reject.
              that.receiveStatus = error;
              that.clearSyncRequest();
            }
          );
        }, 10000);
      }
    },
    stopPing() {
      clearInterval(this.pinger);
      this.pinger = null;
    },
  },
};
</script>
