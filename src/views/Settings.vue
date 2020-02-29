<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">Settings</v-card-title>
    <v-card-text>
      <v-row class="mb-4" justify="space-between">
        <v-col class="text-left subheading font-weight-light">MIDI input device</v-col>
      </v-row>
      <v-select
        :items="inputDevices"
        :value="selectedInputDevice"
        @change="midiInputDeviceChanged"
        label="MIDI input devices"
        placeholder="Select a device"
        solo
      ></v-select>

      <v-row class="mb-4" justify="space-between">
        <v-col class="text-left subheading font-weight-light">MIDI output device</v-col>
      </v-row>
      <v-select
        :items="outputDevices"
        :value="selectedOutputDevice"
        @change="midiOutputDeviceChanged"
        label="MIDI output devices"
        placeholder="Select a device"
        solo
      ></v-select>

      <v-row class="mb-4" justify="space-between">
        <v-col class="text-left subheading font-weight-light">
          <span>MIDI port:</span>
          <span v-text="midiPort" />
        </v-col>
      </v-row>
      <v-slider v-model="midiPort" always-dirty min="1" max="16" />

      <v-row class="mb-4" justify="space-between">
        <v-col class="text-left subheading font-weight-light">
          <span>Pause&nbsp;</span>
          <span v-text="uploadDelay" />
          <span>&nbsp;ms between messages</span>
        </v-col>
      </v-row>
      <v-slider v-model="uploadDelay" always-dirty min="1" max="1000" />
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "Settings",
  computed: {
    ...mapGetters(["settings"]),
    inputDevices() {
      return this.$MIDI.inputDevices.map(x => {
        return { text: x.name, value: x.id };
      });
    },
    outputDevices() {
      return this.$MIDI.outputDevices.map(x => {
        return { text: x.name, value: x.id };
      });
    },
    selectedInputDevice() {
      return this.settings.midiInputDevice || "";
    },
    selectedOutputDevice() {
      return this.settings.midiOutputDevice || "";
    },
    midiPort: {
      get() {
        return this.settings.midiPort;
      },
      set(value) {
        this.$store.dispatch("setMidiPort", value);
      }
    },
    uploadDelay: {
      get() {
        return this.settings.uploadDelay;
      },
      set(value) {
        this.$store.dispatch("setMidiUploadDelay", value);
      }
    }
  },
  methods: {
    midiInputDeviceChanged(deviceId) {
      this.$store.dispatch("setMidiInputDevice", deviceId);
    },
    midiOutputDeviceChanged(deviceId) {
      this.$store.dispatch("setMidiOutputDevice", deviceId);
    }
  }
};
</script>
