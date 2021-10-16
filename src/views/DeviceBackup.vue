<template>
  <v-container fluid>
    <v-alert
      icon="mdi-alert"
      border="left"
      type="warning">This functionality is currently a work in progress and should not be used!</v-alert>
    <v-alert v-if="errorMessage"
      icon="mdi-alert"
      border="left"
      type="error">{{ errorMessage }}</v-alert>
    <v-row v-if="!!currentBackup">
      <v-col cols="8">
        <v-card>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
            <!--<piano-roll @mouse-move="onMouseMove" @mouse-down="onMouseDown" @mouse-up="onMouseUp" />-->
            <v-data-table dense fixed-header :headers="hexHeader" :items="hexData"></v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card>
          <v-card-title>
            <v-text-field
              v-model="currentBackupName"
              label="Name"
              solo-inverted
            ></v-text-field>
          </v-card-title>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
        <v-btn @click="requestDeviceBackup">Backup</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
//import PianoRoll from "@/components/PianoRoll/PianoRoll.vue";

export default {
  name: "DeviceBackup",
  //components: { PianoRoll },
  props: {
    id: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      errorMessage: null,
      currentBackup: null,
      hexHeader: [
        { text: "Address", value: "address", align: "start", divider: true, width: "100" },
        { text: "Data", value: "data", align: "start" }
      ],
      hexData: []
    };
  },
  /* eslint-disable no-console */
  mounted() {
    console.log("DeviceBackup:mounted");
    console.log(this.id);
    this.openBackupFile(this.id);//$route.params.id);
  },
  watch: {
    id() {
      this.openBackupFile(this.id);
    }
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    ...mapGetters(["backupFiles"]),
    midiInDevice() {
      return this.$MIDI?.webMidi?.getInputById(this.settings.midiInputDevice) ?? null;
    },
    midiOutDevice() {
      return this.$MIDI?.webMidi?.getOutputById(this.settings.midiOutputDevice) ?? null;
    },
    currentBackupName: {
      get() {
        return this.currentBackup.name;
      },
      set(value) {
        if(value !== this.currentBackup.name) {
          this.$store.dispatch("renameBackupFile", {
            file: this.currentBackup,
            name: value,
          });
        }
      },
    },
  },
  methods: {
    openBackupFile(id) {
      /*if (
        (!this.currentBackup || this.currentBackup.data.length == 0) &&
        this.backupFiles.length > 0
      ) {
        this.openBackupFile(0);
      }*/
      if (Number.isInteger(id)) {
        if(id < this.backupFiles.length) {
          this.errorMessage = null;
          this.currentBackup = this.backupFiles[id];
        } else {
          this.errorMessage = "Backup not found";
          return;
        }
      } else {
        this.errorMessage = null;
        this.currentBackup = { name: "new", data: new Uint8Array() };
        console.log("new backup");
        console.log(id);
        console.log(this.backupFiles);
      }

      // Create hex view.
      const data = this.currentBackup.data;
      let line = 0;
      for (let i = 0; i < data.length; ++i) {
        if (i % 16 === 0) {
          line = this.hexData.length;
          this.hexData.push({ address: "0x" + (0 + i.toString(16)).slice(-2) + " ", data: "" })
        }
        this.hexData[line].data += "0x" + (0 + data[i].toString(16)).slice(-2) + ", ";
      }
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
    requestDeviceBackup() {
      if (!this.device) {
        return;
      }
      this.makeSyncRequest(
        [
          new Uint8Array([0x03, 0x03, 0x7d, 0x03]), // MemoryDump.
        ],
        2000
      );
    },
    /* eslint-disable no-console */
    onMouseMove(evt) {
      console.log(evt);
    },
    onMouseDown(evt) {
      console.log(evt);
    },
    onMouseUp(evt) {
      console.log(evt);
    },
    /* eslint-enable no-console */
  },
};
</script>
