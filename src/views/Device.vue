<script>
//import settingsSchema from "@/assets/schemas/settings.json";
import DeviceInfo from "@/components/DeviceInfo.vue";
import { mapGetters } from "vuex";

export default {
  name: "Device",
  components: {
    DeviceInfo
  },
  mounted() {},
  data() {
    return {
      deviceInfo: {}
    };
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    midiInDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getInputById(this.settings.midiInputDevice);
      }
      return null;
    }
  },
  methods: {}
};
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <DeviceInfo :data="deviceInfo" :info="0" />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <p>Settings:</p>
        <h5>No Releases</h5>
      </v-col>
    </v-row>
  </v-container>
</template>
