<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-alert
          icon="mdi-alert"
          border="left"
          type="warning">This functionality is currently a work in progress!</v-alert>
        <v-card class="mr-auto" max-width="600px" :loading="loading" :disabled="loading">
          <v-card-title class="headline">
            Device info&nbsp;
            <v-btn color="secondary" x-small @click="$emit('device:sync')">
              <v-icon left>mdi-refresh</v-icon>Sync
            </v-btn>
            <v-spacer />
          </v-card-title>
          <v-card-subtitle></v-card-subtitle>
          <v-card-text>
            <div>No settings detected. This could be to due to old version of firmware, try updating to the latest.</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "DeviceHome",
  props: {
    device: Object,
    loading: Boolean
  },
  components: {
  },
  data() {
    return {
    };
  },
  computed: {
  },
  mounted() {
  },
  beforeDestroy() {
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
