<template>
  <v-container v-if="$MIDI.webMidi">
    <p>Sorry this will work more reliably in next version</p>
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
      fileReader.onload = function() {
        const fileData = new Uint8Array(fileReader.result);

        // Verify that this file contains sysex data.
        if (fileData[0] !== 0xf0 || fileData[fileData.length - 1] !== 0xf7) {
          that.uploadStatus = "Not a SysEx file, aborting!";
          that.uploadProgressData = 100;
          that.inputFile = null;
          return;
        }

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
        for (let i = 0; i < sysExDataTracks.length; ++i) {
          const uploadDelay = "+" + (i * that.settings.uploadDelay).toString();
          /* eslint-disable no-console */
          console.log(uploadDelay);
          /* eslint-enable no-console */
          that.uploadProgressData = Math.trunc(
            (100 * (i + 1)) / sysExDataTracks.length
          );
          that.midiOutDevice.sendSysex(0x7d, Array.from(sysExDataTracks[i]), {
            time: uploadDelay
          });
        }

        if (!that.midiOutDevice) {
          that.uploadStatus = "No active midi output device, aborting!";
        } else {
          that.uploadStatus = "Done uploading";
        }
        that.inputFile = null;
        that.uploadProgress = 100;
        //that.delayUploadSysEx(that.settings.uploadDelay, sysExDataTracks, 0);
      };
      fileReader.readAsArrayBuffer(file);
    },
    delayUploadSysEx(delayMs, tracks, currentTrack) {
      if (this.midiOutDevice && currentTrack < tracks.length) {
        this.uploadProgressData = Math.trunc(
          (100 * (currentTrack + 1)) / tracks.length
        );
        this.midiOutDevice.sendSysex(0x7d, Array.from(tracks[currentTrack]));
        setTimeout(() => {
          this.delayUploadSysEx(delayMs, tracks, currentTrack + 1);
        }, delayMs);
      } else {
        if (!this.midiOutDevice) {
          this.uploadStatus = "No active midi output device, aborting!";
        } else {
          this.uploadStatus = "Done uploading";
        }
        this.inputFile = null;
        this.uploadProgress = 1000;
      }
    }
  }
};
</script>
