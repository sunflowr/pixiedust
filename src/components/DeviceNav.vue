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
      :disabled="loading"
      :files="backupFiles"
      :activeFile="activeBackupFile"
      @sync-memory="$emit('device:request-backup')"
      @select-file="(index, file) => $emit('device:view-backup-file', index, file)"
      class="pa-1 transparent"
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
    backupFiles: Array,
    activeBackupFile: Number
  },
  components: {
    DeviceInfo,
    FileList
  }
};
</script>
