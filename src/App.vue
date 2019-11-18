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
    const { ipcRenderer } = require("electron");
    if (ipcRenderer) {
      /* eslint-disable no-unused-vars */
      ipcRenderer.on("navigate", (e, routePath) => {
        if(this.$route.path !== routePath){
          this.$router.push(routePath);
        }
      });
      /* eslint-enable no-unused-vars */
    }
    this.$MIDI.$on("midi:initialized", this.midiInitialized);
    this.$MIDI.$on("midi:failed", this.midiFailed);
    this.$MIDI.$on("midi:connected", this.midiConnected);
    this.$MIDI.$on("midi:disconnected", this.midiDisconnected);
    //this.midiInitialized();
  },
  computed: {
    routes() {
      return this.$router.options.routes;
    },
    currentRouteIcon() {
      return this.$route.meta.icon;
    },
    currentRouteName() {
      return this.$route.meta.title;
    }
  },
  methods: {
    /* eslint-disable no-unused-vars */
    midiInitialized(msg) {
      if (!this.$Settings.midiInputDevice) {
        this.$Settings.midiInputDevice = this.$MIDI.inputDevices[0].id || "";
      }
      if (!this.$Settings.midiOutputDevice) {
        this.$Settings.midiOutputDevice = this.$MIDI.outputDevices[0].id || "";
      }
    },
    /* eslint-enable no-unused-vars */
    midiFailed(msg) {
      this.errorMessage = {
        title: "Failed to initialize MIDI",
        text: msg
      };
    },
    /* eslint-disable no-unused-vars */
    midiConnected(ev) {
    },
    /* eslint-enable no-unused-vars */
    midiDisconnected(ev) {
      if (ev.port.id === this.$Settings.midiInputDevice) {
        this.$Settings.midiInputDevice = this.$MIDI.inputDevices[0].id || "";
      }
      if (ev.port.id === this.$Settings.midiOutputDevice) {
        this.$Settings.midiOutputDevice = this.$MIDI.outputDevices[0].id || "";
      }
    }
  }
};
</script>
