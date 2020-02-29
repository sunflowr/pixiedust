<template>
  <v-app>
    <!-- v-model="drawer" -->
    <v-navigation-drawer :mini-variant="!expandedMenu" app permanent>
      <v-list dense>
        <v-tooltip :disabled="expandedMenu" right>
          <template #activator="{ on }">
            <v-list-item v-on="on" link @click="expandedMenu=!expandedMenu">
              <v-list-item-action>
                <v-icon v-if="!expandedMenu">mdi-arrow-expand-right</v-icon>
                <v-icon v-if="expandedMenu">mdi-arrow-expand-left</v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title v-if="expandedMenu">Collapse menu</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
          <span>Expand menu</span>
        </v-tooltip>

        <v-tooltip
          :disabled="expandedMenu"
          right
          v-for="route in this.$router.options.routes"
          v-bind:key="route.meta.index"
        >
          <template #activator="{ on }">
            <v-list-item v-on="on" link :to="route.path">
              <v-list-item-action>
                <v-icon>{{ route.meta.icon }}</v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{ route.meta.title }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
          <span>{{ route.meta.title }}</span>
        </v-tooltip>
      </v-list>
    </v-navigation-drawer>

    <!-- v-slot:extension-->
    <v-app-bar app dense title flat color="#303030">
      <v-toolbar-title>{{ currentRouteName }}</v-toolbar-title>
      <!--<template v-slot:default>
        <v-tabs align-with-title show-arrows background-color="transparent">
          <v-tabs-slider />
          <v-tab to="/">Home</v-tab>
          <v-tab to="/sysextool">SysEx Tool</v-tab>
          <v-tab to="/settings">Settings</v-tab>
          <v-tab to="/about">About</v-tab>
          <v-tab>Item Three</v-tab>
        </v-tabs>
      </template>-->
    </v-app-bar>

    <v-content>
      <v-container>
        <router-view />
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
import { mapGetters } from "vuex";
import sysExHandler from "@/SysExHandler";
import { sysExMessages } from "@/SysExMessages";

export default {
  name: "App",
  data: () => ({
    expandedMenu: false,
    drawer: null
  }),
  created() {
    this.$vuetify.theme.dark = true;
  },
  mounted() {
    if (this.isElectronApp()) {
      const { ipcRenderer } = require("electron");
      if (ipcRenderer) {
        /* eslint-disable no-unused-vars */
        ipcRenderer.on("navigate", (e, routePath) => {
          if (this.$route.path !== routePath) {
            this.$router.push(routePath);
          }
        });
        /* eslint-enable no-unused-vars */
      }
    }
    this.$MIDI.$on("midi:initialized", this.midiInitialized);
    this.$MIDI.$on("midi:failed", this.midiFailed);
    this.$MIDI.$on("midi:connected", this.midiConnected);
    this.$MIDI.$on("midi:disconnected", this.midiDisconnected);
    //this.midiInitialized();

    /* eslint-disable no-unused-vars */
    this.$store.subscribeAction({
      before: (action, state) => {
        if (action.type === "setMidiInputDevice" && this.midiInDevice) {
          this.midiInDevice.removeListener(
            "sysex",
            undefined,
            this.onMidiSysExReceive
          );
        }
      },
      after: (action, state) => {
        if (action.type === "setMidiInputDevice" && this.midiInDevice) {
          this.midiInDevice.addListener(
            "sysex",
            undefined,
            this.onMidiSysExReceive
          );
        }
      }
    });
    /* eslint-enable no-unused-vars */
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    routes() {
      return this.$router.options.routes;
    },
    currentRouteIcon() {
      return this.$route.meta.icon;
    },
    currentRouteName() {
      return this.$route.meta.title;
    },
    midiOutDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getOutputById(this.settings.midiOutputDevice);
      }
      return null;
    },
    midiInDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getInputById(this.settings.midiInputDevice);
      }
      return null;
    }
  },
  methods: {
    /* eslint-disable no-unused-vars */
    midiInitialized(msg) {
      this.midiSetDefaultDeviceIfEmpty();
    },
    /* eslint-enable no-unused-vars */
    midiFailed(msg) {
      this.errorMessage = {
        title: "Failed to initialize MIDI",
        text: msg
      };
    },
    midiSetInputDevice(deviceId) {
      this.$store.dispatch("setMidiInputDevice", deviceId);
    },
    midiSetOutputDevice(deviceId) {
      this.$store.dispatch("setMidiOutputDevice", deviceId);
    },
    midiSetDefaultDeviceIfEmpty() {
      if (!this.settings.midiInputDevice) {
        this.midiSetInputDevice(this.$MIDI.inputDevices[0].id || "");
      }
      if (!this.settings.midiOutputDevice) {
        this.midiSetOutputDevice(this.$MIDI.outputDevices[0].id || "");
      }
    },
    /* eslint-disable no-unused-vars */
    midiConnected(ev) {
      this.midiSetDefaultDeviceIfEmpty();
    },
    /* eslint-enable no-unused-vars */
    midiDisconnected(ev) {
      if (ev.port.id === this.settings.midiInputDevice) {
        this.$store.dispatch(
          "setMidiInputDevice",
          this.$MIDI.inputDevices[0].id || ""
        );
      }
      if (ev.port.id === this.settings.midiOutputDevice) {
        this.$store.dispatch(
          "setMidiOutputDevice",
          this.$MIDI.outputDevices[0].id || ""
        );
      }
      this.midiSetDefaultDeviceIfEmpty();
    },
    /* eslint-disable no-unused-vars */
    onMidiSysExReceive(ev) {
      this.$router.app.$emit("sysex-receive", ev);
      sysExHandler.onSysEx(ev.data, sysExMessages);
    },
    /* eslint-enable no-unused-vars */
    isElectronApp() {
      // Renderer process
      if (
        typeof window !== "undefined" &&
        typeof window.process === "object" &&
        window.process.type === "renderer"
      ) {
        return true;
      }

      // Main process
      if (
        typeof process !== "undefined" &&
        typeof process.versions === "object" &&
        !!process.versions.electron
      ) {
        return true;
      }

      // Detect the user agent when the `nodeIntegration` option is set to true
      if (
        typeof navigator === "object" &&
        typeof navigator.userAgent === "string" &&
        navigator.userAgent.toLowerCase().indexOf(" electron/") >= 0
      ) {
        return true;
      }

      return false;
    }
  }
};
</script>
