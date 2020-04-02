<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" v-if="!!receiveStatus && receiveStatus.length > 0">{{ receiveStatus }}</v-col>
      <v-col cols="12" v-if="!!device && !syncRequest">
        <v-card class="mx-auto" max-width="600px" :disabled="isDisabled" :loading="isLoading">
          <v-card-title class="headline">
            Settings
            <v-spacer />
            <v-btn>Save</v-btn>
          </v-card-title>
          <v-card-subtitle></v-card-subtitle>
          <v-card-text>
            <div v-if="!!deviceSettings">
              <v-row justify="space-between">
                <v-col cols="12" md="12" v-for="(value,key) in visibleSettings" v-bind:key="key">
                  <DataTypeCheckbox
                    v-if="value.type.view === 'checkbox'"
                    :label="value.type.name"
                    :value="value.value"
                    @value-changed="onValueChanged($event)"
                  ></DataTypeCheckbox>
                  <DataTypeRange
                    v-else-if="value.type.view === 'range'"
                    :label="value.type.name"
                    :value="value.value"
                    :min="value.type.range[0]"
                    :max="value.type.range[1]"
                    @value-changed="onValueChanged($event)"
                  ></DataTypeRange>
                  <div v-else>{{ value.type.name }}: {{ value.value }}</div>
                </v-col>
                <v-col cols="12" md="12"></v-col>
              </v-row>
            </div>
            <div
              v-else
            >No settings detected. This could be to due to old version of firmware, try updating to the latest.</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
import { sysExMessageDescs } from "@/SysExMessages";
import { Version } from "@/version";
import { Settings } from "@/settings";
import DataTypeRange from "@/components/DataTypeRange.vue";
import DataTypeCheckbox from "@/components/DataTypeCheckbox.vue";

export default {
  name: "DeviceSettings",
  components: {
    DataTypeRange,
    DataTypeCheckbox
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
    ...mapGetters(["backupFiles"]),
    isDisabled() {
      return !!this.syncRequest;
    },
    isLoading() {
      return !!this.syncRequest;
    },
    deviceSettings() {
      if (this.device) {
        return this.device.settings;
      }
      return null;
    },
    visibleSettings() {
      if (this.deviceSettings) {
        const schema = this.deviceSettings.getSchema();
        const settings = {};
        const entries = Object.entries(this.deviceSettings);
        for (let i = 0; i < entries.length; ++i) {
          const key = entries[i][0];
          const val = entries[i][1];
          if ("view" in schema[key]) {
            settings[key] = { value: val, type: schema[key] };
          }
        }
        return settings;
      }
      return null;
    },
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
    onValueChanged(x) {
      /* eslint-disable no-console */
      console.log(x);
      /* eslint-enable no-console */
    },
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
    makeSyncRequest(sysExTracks, timeoutMS) {
      if (this.syncRequest) {
        return;
      }
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.syncRequest = {
          tracks: sysExTracks,
          timeout: setTimeout(this.onSyncTimedOut, timeoutMS),
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
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]) // Settings.
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
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]) // Settings.
        ],
        2000
      );
    }
  }
};
</script>
