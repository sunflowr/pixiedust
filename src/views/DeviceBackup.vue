<template>
  <v-container fluid>
    <v-btn @click="requestDeviceBackup">Backup</v-btn>
    <v-card v-if="!!currentBackup">
      <v-card-title>
        <v-text-field
          v-model="currentBackupName"
          label="Name"
          solo-inverted
        ></v-text-field>
      </v-card-title>
      <v-card-text style="font-family: monospace" v-if="!!hexView">
        <piano-roll @mouse-move="onMouseMove" @mouse-down="onMouseDown" @mouse-up="onMouseUp" />
        <div>Data:</div>
        <div v-for="(line, i) in hexView" :key="i">
          <span>{{ line }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
import PianoRoll from "@/components/PianoRoll/PianoRoll.vue";

export default {
  name: "DeviceBackup",
  components: { PianoRoll },
  data() {
    return {
      currentBackup: null,
      hexView: null,
    };
  },
  /* eslint-disable no-unused-vars */
  /* eslint-disable no-console */
  mounted() {
    console.log("DeviceBackup:mounted");
    this.openBackupFile(this.$route.params.id);
  },
  beforeRouteUpdate(to, from, next) {
    console.log("DeviceBackup:beforeRouteUpdate");
    console.log(to);
    console.log(from);
    if (to.params.id && to.params.id >= this.backupFiles.length) {
      next(new Error("Invalid backup file"));
    } else {
      this.openBackupFile(to.params.id);
      next();
    }
  },
  watch: {
    backupFiles() {
      if (
        (!this.currentBackup || this.currentBackup.data.length == 0) &&
        this.backupFiles.length > 0
      ) {
        this.openBackupFile(0);
      }
    },
  },
  /* eslint-enable no-console */
  /* eslint-enable no-unused-vars */
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
    currentBackupName: {
      get() {
        return this.currentBackup.name;
      },
      /* eslint-disable no-unused-vars */
      set(value) {
        this.$store.dispatch("renameBackupFile", {
          file: this.currentBackup,
          name: value,
        });
      },
      /* eslint-enable no-unused-vars */
    },
  },
  methods: {
    openBackupFile(id) {
      if (id && id < this.backupFiles.length) {
        this.currentBackup = this.backupFiles[id];
      } else {
        this.currentBackup = { name: "new", data: new Uint8Array() };
      }

      // Create hex view.
      const data = this.currentBackup.data;
      let line = 0;
      this.hexView = [];
      for (let i = 0; i < data.length; ++i) {
        if (i % 16 === 0) {
          line = this.hexView.length;
          this.hexView.push("0x" + (0 + i.toString(16)).slice(-2) + " ");
        }
        this.hexView[line] += (0 + data[i].toString(16)).slice(-2);
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
