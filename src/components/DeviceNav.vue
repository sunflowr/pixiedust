<template>
  <v-navigation-drawer app clipped permanent left>
    <v-list nav>
      <v-list-item>
        <DeviceInfo
          :device="device"
          :loading="loading"
          @sync-request="$emit('device:sync')"
          class="mx-auto pa-0 transparent"
        ></DeviceInfo>
      </v-list-item>
      <v-list-item :disabled="loading">
        <v-btn color="secondary" block to="/device/settings" :disabled="!device || loading">
          Settings
          <v-icon right>mdi-cogs</v-icon>
        </v-btn>
      </v-list-item>
    </v-list>
    <FileList
      label="Backups"
      :loading="loading"
      :files="backupFiles"
      @sync-memory="requestDeviceBackup"
      @select-file="openBackupFile"
      class="pa-0 transparent"
    ></FileList>
  </v-navigation-drawer>
</template>

<script>
import DeviceInfo from "@/components/DeviceInfo.vue";
import FileList from "@/components/FileList.vue";

export default {
  name: "DeviceNav",
  props: {
    device: Object,
    loading: Boolean,
    syncRequest: Object,
    backupFiles: Array
  },
  components: {
    DeviceInfo,
    FileList
  },
  methods: {
    requestDeviceBackup() {
      const routePath = "/device/backup";
      if (this.$route.path !== routePath) {
        this.$router.push(routePath);
      }
    },
    /* eslint-disable no-unused-vars */
    openBackupFile(index, file) {
      const routePath = "/device/backup/" + index;
      if (this.$route.path !== routePath) {
        this.$router.push(routePath);
      }
    }
    /* eslint-enable no-unused-vars */
  }
};
</script>
