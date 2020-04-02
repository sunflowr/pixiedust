<template>
  <v-container fluid>
    <v-card
      flat
      class="mx-auto pa-0 transparent"
      :loading="syncing"
      :disabled="syncing"
    >
      <v-card-title class="pa-0">
        RE-CPU info
        <v-spacer />
        <v-btn color="secondary" x-small @click="$emit('sync-request')">
          <v-icon left>mdi-refresh</v-icon>Sync
        </v-btn>
      </v-card-title>
      <div class="my-2" v-if="!!device && !syncing">
        <v-card-subtitle class="pa-0 font-weight-medium">Bootloader</v-card-subtitle>
        <v-menu offset-x>
          <template v-slot:activator="{ on }">
            <v-btn v-if="!!device.bootloaderVersion" block small v-on="on" class="teal">
              {{ device.bootloaderVersion.name }}
              <v-spacer />
              {{ device.bootloaderVersion.getVersionString() }}
            </v-btn>
            <v-btn v-else block small v-on="on" class="error">No bootloader detected</v-btn>
          </template>
          <v-card>
            <v-list>
              <v-list-item>todo</v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>

      <div class="my-2" v-if="!!device && !syncing">
        <v-card-subtitle class="pa-0 font-weight-medium">Application</v-card-subtitle>
        <v-menu offset-x>
          <template v-slot:activator="{ on }">
            <v-btn v-if="!!device.appVersion" block small v-on="on" class="teal">
              {{ device.appVersion.name }}
              <v-spacer />
              {{ device.appVersion.getVersionString() }}
            </v-btn>
            <v-btn v-else block small v-on="on" class="error">No application detected</v-btn>
          </template>
          <v-card>
            <v-list>
              <v-list-item>No sequencer application detected. Have you installed it on the RE-CPU?</v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "DeviceInfo",
  props: {
    device: Object,
    syncing: Boolean
  }
};
</script>
