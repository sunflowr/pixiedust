<template>
  <v-card class="mx-auto" max-width="600px" v-if="device">
    <v-card-title class="headline">Firmware info</v-card-title>
    <v-card-subtitle></v-card-subtitle>
    <v-card-text>
      <ul v-if="device.bootloaderVersion">
        <li>Bootloader Version: {{ device.bootloaderVersion.getVersionString() }}</li>
        <li>Bootloader Name: {{ device.bootloaderVersion.name }}</li>
      </ul>
      <ul v-if="device.appVersion">
        <li>App Version: {{ device.appVersion.getVersionString() }}</li>
        <li>App Name: {{ device.appVersion.name }}</li>
      </ul>
      <ul v-else>
        <li>No sequencer application detected. Have you installed it on the RE-CPU?</li>
      </ul>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "DeviceInfo",
  props: {
    device: Object
  }
};
</script>
