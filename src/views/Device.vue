<template>
  <v-container>
    <v-navigation-drawer app clipped permanent>
      <v-list dense nav>
        <v-list-item>
          <v-list-item-icon>
            <v-icon>mdi-refresh</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Sync</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon>mdi-cogs</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Settings</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <v-card raised>
        <v-card-title class="headline">
          <div>RE-CPU info</div>
          <v-spacer />
          <v-btn
            color="secondary"
            x-small
            :disabled="syncRequest !== null"
            :loading="syncRequest !== null"
            @click="syncDeviceInfo"
          >
            <v-icon left>mdi-refresh</v-icon>Sync
          </v-btn>
        </v-card-title>
      </v-card>
      <FileList />
    </v-navigation-drawer>

    <v-container fluid>
      <v-card class="mx-auto" max-width="600px">
        <v-card-title class="headline">
          <div>RE-CPU info</div>
          <v-spacer />
          <v-btn
            color="secondary"
            x-small
            :disabled="syncRequest !== null"
            :loading="syncRequest !== null"
            @click="syncDeviceInfo"
          >
            <v-icon left>mdi-refresh</v-icon>Sync
          </v-btn>
        </v-card-title>
      </v-card>

      <v-row>
        <v-col
          cols="12"
          v-if="receiveStatus !== null && receiveStatus.length > 0"
        >{{ receiveStatus }}</v-col>
        <v-col cols="12">
          <DeviceInfo v-if="device && !syncRequest" :device="device"></DeviceInfo>
        </v-col>
        <v-col cols="12">
          <DeviceSettings v-if="device && !syncRequest" :settings="device.settings"></DeviceSettings>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script>
import DeviceInfo from "@/components/DeviceInfo.vue";
import DeviceSettings from "@/components/DeviceSettings.vue";
import FileList from "@/components/FileList.vue";
import { mapGetters } from "vuex";
import { sysExMessageDescs } from "@/SysExMessages";
import { Version } from "@/version";
import { Settings } from "@/settings";

export default {
  name: "Device",
  components: {
    DeviceInfo,
    DeviceSettings,
    FileList
  },
  data() {
    return {
      syncRequest: null,
      receiveStatus: "",
      memoryDump: null
    };
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
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
    }
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
      this.memoryDump = message.data;
      /* eslint-disable no-console */
      console.log("memory dump:");
      console.log(this.memoryDump);
      /* eslint-enable no-console */
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
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.syncRequest = {
          tracks: [
            new Uint8Array([0x03, 0x03, 0x7c, 0x00]), // Bootloader version.
            new Uint8Array([0x03, 0x03, 0x7c, 0x01]), // Application version.
            new Uint8Array([0x03, 0x03, 0x7d, 0x02]), // Settings.
            new Uint8Array([0x03, 0x03, 0x7d, 0x03]) // MemoryDump.
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
