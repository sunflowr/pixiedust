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
          <span v-text="settings.midiPort" />
        </v-col>
      </v-row>
      <v-slider v-model="settings.midiPort" always-dirty min="1" max="16" />

      <v-row class="mb-4" justify="space-between">
        <v-col class="text-left subheading font-weight-light">
          <span>Pause</span>
          <span v-text="settings.uploadDelay" />
          <span>ms between messages</span>
        </v-col>
      </v-row>
      <v-slider v-model="settings.uploadDelay" always-dirty min="1" max="1000" />
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "Settings",
  computed: {
    settings: {
      get() {
        return this.$Settings;
      }
    },
    midi: {
      get() {
        return this.$MIDI;
      }
    },
    inputDevices: {
      get() {
        return this.midi.inputDevices.map(x => {
          return { text: x.name, value: x.id };
        });
      }
    },
    outputDevices: {
      get() {
        return this.midi.outputDevices.map(x => {
          return { text: x.name, value: x.id };
        });
      }
    },
    selectedInputDevice: {
      get() {
        return this.settings.midiInputDevice || "";
      }
    },
    selectedOutputDevice: {
      get() {
        return this.settings.midiOutputDevice || "";
      }
    }
  },
  methods: {
    midiInputDeviceChanged(deviceId) {
      this.settings.midiInputDevice = deviceId;
    },
    midiOutputDeviceChanged(deviceId) {
      this.settings.midiOutputDevice = deviceId;
    }
  }
};
</script>
