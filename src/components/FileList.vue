<template>
  <v-card flat outlined :loading="syncing" :disabled="syncing">
    <v-card-title>
      <v-icon left>mdi-folder</v-icon>
      <span class="title font-weight-light">{{ label }}</span>
      <v-spacer />
      <v-menu bottom>
        <template v-slot:activator="{ on }">
          <v-btn x-small icon v-on="on">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item @click="$emit('sync-memory')">
            <v-list-item-icon>
              <v-icon>mdi-refresh</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Sync from device</v-list-item-title>
          </v-list-item>
          <v-list-item @click="importFile">
            <v-list-item-icon>
              <v-icon>mdi-file-import</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Import from file</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>
    <v-card-text class="pa-0 inset">
      <v-divider />
      <v-list dense>
        <v-list-item v-for="(file, i) in files" :key="i" @click="$emit('select-file', i, file)">
          <v-list-item-content>
            <v-list-item-title>{{ file.name }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <v-menu bottom>
              <template v-slot:activator="{ on }">
                <v-btn x-small icon v-on="on">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list dense>
                <v-list-item @click="exportFile(file)">
                  <v-list-item-icon>
                    <v-icon>mdi-file-export</v-icon>
                  </v-list-item-icon>
                  <v-list-item-title>Export to device</v-list-item-title>
                </v-list-item>
                <v-list-item @click="exportFile(file)">
                  <v-list-item-icon>
                    <v-icon>mdi-file-export</v-icon>
                  </v-list-item-icon>
                  <v-list-item-title>Export to file</v-list-item-title>
                </v-list-item>
                <v-list-item @click="renameFile(file)">
                  <v-list-item-icon>
                    <v-icon>mdi-file-export</v-icon>
                  </v-list-item-icon>
                  <v-list-item-title>Rename</v-list-item-title>
                </v-list-item>
                <v-divider />
                <v-list-item @click="deleteFile(file)">
                  <v-list-item-icon>
                    <v-icon>mdi-delete</v-icon>
                  </v-list-item-icon>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.inset {
  padding: 0;
  box-shadow: inset 1px 1px 10px #333;
  background-color: rgba(0, 0, 0, 0.2);
  overflow: hidden;
  overflow-y: scroll;
}
</style>

<script>
export default {
  name: "DataTypeCheckbox",
  props: {
    label: String,
    files: Array,
    syncing: Boolean
  },
  methods: {
    /* eslint-disable no-console */
    importFile() {
      console.log(`importFile()`);
    },
    exportFile(file) {
      console.log(`exportFile(${file.name})`);
    },
    renameFile(file) {
      console.log(`renameFile(${file.name})`);
    },
    deleteFile(file) {
      console.log(`deleteFile(${file.name})`);
      this.$store.dispatch("removeBackupFile", file);
    }
    /* eslint-enable no-console */
  }
};
</script>
