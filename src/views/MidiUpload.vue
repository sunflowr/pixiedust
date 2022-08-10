<template>
  <v-container v-if="this.$MIDI.webMidi">
      <v-alert
        icon="mdi-alert"
        border="left"
        type="warning">This functionality is currently a work in progress!</v-alert>
      <v-card class="mr-auto" max-width="600px">
        <v-card-title class="headline">
          Select a SysEx file to send
        </v-card-title>
        <v-card-subtitle></v-card-subtitle>
        <v-card-text>
          <v-file-input
            :disabled="inputFile != null"
            v-model="inputFile"
            accept="application/x-sysex"
            show-size
            dense
            label="Input"
            placeholder="Select a SysEx file to send"
          />
          <v-btn color="primary" :disabled="inputFile == null" large @click="uploadSysExFile">Send</v-btn>
        </v-card-text>
      </v-card>
      <v-dialog v-model="uploadDialog" persistent max-width="640px">
        <v-card>
          <v-card-title class="headline">{{ uploadStatus }}</v-card-title>
          <v-container>
            <v-row>
              <v-col>
                <v-progress-linear :value="uploadProgress" height="10px" rounded striped />
              </v-col>
            </v-row>
            <v-row justify="space-between">
              <v-col>
                <div class="text-center">
                  <v-btn
                    color="primary"
                    :disabled="inputFile != null"
                    medium
                    @click="uploadDialog=false"
                  >Close</v-btn>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-card>
      </v-dialog>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
import { sysExUtil } from "@/plugins/sysexutil";

export default {
  name: "MidiUpload",
  data() {
    return {
      uploadDialog: false,
      inputFile: null,
      uploadProgressData: 0,
      uploadStatus: ""
    };
  },
  computed: {
    ...mapGetters(["settings"]),
    midiOutDevice() {
      return this.$MIDI.webMidi.getOutputById(this.settings.midiOutputDevice);
    },
    midiOutDeviceName() {
      return (
        this.midiOutDevice.name || "&lt;no midi output device selected&gt;"
      );
    },
    uploadProgress: {
      get() {
        return this.uploadProgressData;
      },
      set(value) {
        this.uploadProgressData = value;
      }
    }
  },
  methods: {
    uploadSysExFile() {
      const file = this.inputFile;
      this.uploadProgressData = 0;
      this.uploadStatus =
        "Uploading " +
        this.inputFile.name +
        " over " +
        this.midiOutDeviceName +
        "...";
      this.uploadDialog = true;

      // Load SysEx file.
      const that = this;
      const fileReader = new FileReader();
      fileReader.onload = function(loadEvent) {
        const fileData = new Uint8Array(loadEvent.target.result);

        // Verify that this file contains sysex data.
        if (!sysExUtil.isSysEx(fileData)) {
          that.uploadStatus = "Not a SysEx file, aborting!";
          that.uploadProgressData = 100;
          that.inputFile = null;
          return;
        }

        // Split file in to multiple SysEx message tracks.
        let sysExDataTracks = [];
        let sysExStart = 0;
        let sysExEnd = 0;
        for (let i = 0; i < fileData.length; ++i) {
          if (fileData[i] === 0xf0) {
            sysExStart = i;
          } else if (fileData[i] === 0xf7) {
            sysExEnd = i;
            // We're skipping the header and footer when slicing the data.
            sysExDataTracks.push(fileData.slice(sysExStart + 2, sysExEnd));
          }
        }

        // Upload SysEx.
        if (that.$MIDI && that.$MIDI.webMidi) {
          that.$MIDI.sendSysEx(
            that.midiOutDevice,
            sysExDataTracks,
            that.settings.uploadDelay,
            progress => {
              // Progress.
              that.uploadProgressData = progress * 100;
            },
            () => {
              // Resolve.
              that.uploadStatus = "Done uploading";
              that.inputFile = null;
              that.uploadProgress = 100;
            },
            error => {
              // Reject.
              that.uploadStatus = error;
              that.inputFile = null;
              that.uploadProgress = 100;
            }
          );
        } else {
          that.uploadStatus = "No active midi!";
        }
      };
      fileReader.readAsArrayBuffer(file);
    }
  }
};
</script>
