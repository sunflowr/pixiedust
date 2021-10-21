<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" v-if="!!device && !loading">
        <v-card class="mx-auto" max-width="600px" :disabled="disabled" :loading="loading">
          <v-card-title class="headline">
            Settings
            <v-spacer />
            <v-btn>Send to device</v-btn>
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
                    @value-changed="onValueChanged(key, value, $event)"
                  ></DataTypeCheckbox>
                  <DataTypeRange
                    v-else-if="value.type.view === 'range'"
                    :label="value.type.name"
                    :value="value.value"
                    :min="value.type.range[0]"
                    :max="value.type.range[1]"
                    @value-changed="onValueChanged(key, value, $event)"
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
import DataTypeRange from "@/components/DataTypeRange.vue";
import DataTypeCheckbox from "@/components/DataTypeCheckbox.vue";

export default {
  name: "DeviceSettings",
  components: {
    DataTypeRange,
    DataTypeCheckbox
  },
  props: {
    disabled: Boolean,
    loading: Boolean,
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    ...mapGetters(["backupFiles"]),
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
      return this.$MIDI?.webMidi?.getInputById(this.settings.midiInputDevice) ?? null;
    },
    midiOutDevice() {
      return this.$MIDI?.webMidi?.getOutputById(this.settings.midiOutputDevice) ?? null;
    }
  },
  mounted() {},
  beforeDestroy() {},
  methods: {
    onValueChanged(key, value, evt) {
      this.$store.dispatch("updateDeviceSetting", { key: key, value: evt });
    }
  }
};
</script>
