<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">Settings</v-card-title>
    <v-card-subtitle></v-card-subtitle>
    <v-card-text>
      <div v-if="settings">
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
        </v-row>
      </div>
      <div
        v-else
      >No settings detected. This could be to due to old version of firmware, try updating to the latest.</div>
    </v-card-text>
  </v-card>
</template>

<script>
import DataTypeRange from "@/components/DataTypeRange.vue";
import DataTypeCheckbox from "@/components/DataTypeCheckbox.vue";

export default {
  name: "DeviceSettings",
  components: {
    DataTypeRange,
    DataTypeCheckbox
  },
  props: {
    settings: Object
  },
  computed: {
    visibleSettings() {
      if (this.settings) {
        const schema = this.settings.getSchema();
        const settings = {};
        const entries = Object.entries(this.settings);
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
    }
  },
  methods: {
    onValueChanged(x) {
      /* eslint-disable no-console */
      console.log(x);
      /* eslint-enable no-console */
    }
  }
};
</script>
