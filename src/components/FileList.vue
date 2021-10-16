<template>
  <v-card flat outlined :loading="loading" :disabled="disabled">
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
          <v-list-item @click="openImportFileDialog">
            <v-list-item-icon>
              <v-icon>mdi-file-import</v-icon>
            </v-list-item-icon>
            <v-list-item-title>Import from file</v-list-item-title>
            <input ref="importInputFile" style="display: none" type="file">
            <!--<input ref="importInputFile" style="display: none" type="file" accept="application/octet-stream">-->
            <!--<input ref="importInputFile" style="display: none" type="file" accept="application/x-sysex">-->
            <!--<input ref="importInputFile" style="display: none" type="file" accept="audio/midi">-->
            <!--<input ref="importInputFile" style="display: none" type="file" accept="application/json">-->
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>
    <v-card-text class="pa-0 inset">
      <v-divider />
      <v-list dense>
        <v-list-item v-for="(file, i) in files" :key="i" :value="i" @click="$emit('select-file', i, file)" :class="{primary: activeFile === i}">
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
import { saveAs } from "file-saver";

export default {
  name: "FileList",
  props: {
    label: String,
    files: Array,
    activeFile: Number,
    loading: Boolean,
    disabled: Boolean
  },
  methods: {
    openImportFileDialog() {
      const that = this;
      this.$refs.importInputFile.onchange = changeEvent => { 
        const file = changeEvent.target.files[0]; 
        const reader = new FileReader();
        reader.onload = loadEvent => {
          const fileData = new Uint8Array(loadEvent.target.result);
          that.importFile(fileData);
        };
        reader.readAsArrayBuffer(file);
      }
      this.$refs.importInputFile.click();
    },
    importFile(fileData) {
        this.$store.dispatch("addBackupFile", {
          name: `Backup ${this.files.length}`,
          data: Array.from(fileData), // Need to be vanilla array due to localstorage.
        });
    },
    exportFile(file) {
      // TODO: Better sanitization of filenames when exporting.
      const filename = file.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
      saveAs(
        new Blob([new Uint8Array(file.data)], {
          type: "application/octet-stream"
        }),
        `${filename}.bin`,
        { autoBom: false }
      );
    },
    /* eslint-disable no-console */
    renameFile(file) {
      console.log(`renameFile(${file.name})`);
      //this.$store.dispatch("renameBackupFile", file);
    },
    deleteFile(file) {
      console.log(`deleteFile(${file.name})`);
      this.$store.dispatch("removeBackupFile", file);
    }
    /* eslint-enable no-console */
  }
};
</script>
