<template>
  <v-container>
    <v-flex>File type</v-flex>
    <v-select
      v-model="outputDataType"
      :items="dataTypes"
      label="File type"
      placeholder="Select file type"
      solo
    />
    <v-file-input
      v-model="inputFile"
      accept="application/x-sysex"
      show-size
      dense
      label="Input"
      placeholder="Select a file to convert"
      @change="onFileChange"
    />
    <div v-if="fileTest">{{ fileTest }}</div>
    <v-btn color="primary" :disabled="inputFile == null" large @click="convert">Convert</v-btn>
    <v-dialog v-model="convertDialog" persistent max-width="640px">
      <v-card>
        <v-card-title class="headline">{{ convertStatus }}</v-card-title>
        <v-container>
          <v-row>
            <v-col>
              <v-progress-linear :value="convertProgress" height="10px" rounded striped />
            </v-col>
          </v-row>
          <v-row justify="space-between">
            <v-col>
              <div class="text-center">
                <v-btn
                  color="primary"
                  :disabled="sysExFile == null"
                  medium
                  @click="downloadSysEx"
                  class="mx-2"
                >
                  <v-icon left>mdi-download</v-icon>Save
                </v-btn>
                <v-btn
                  color="primary"
                  :disabled="sysExFile == null"
                  medium
                  @click="convertDialog=false"
                  class="mx-2"
                >Close</v-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { sysExTypes, sysExUtil } from "@/plugins/sysexutil";
import { saveAs } from "file-saver";
import { checksumUtil } from "@/plugins/checksumutil";

export default {
  name: "SysExTool",
  data() {
    return {
      dataTypes: [
        { text: "Emulator Firmware", value: "emufw" },
        { text: "Application", value: "application" },
        { text: "Bootloader", value: "bootloader" }
      ],
      checksums: [
        { value: 0x268a8d8b, text: "TB-303 firmware", type: "emufw" },
        { value: 0xeee88f80, text: "TR-606 firmware", type: "emufw" }
      ],
      fileTest: null,
      convertDialog: false,
      outputDataType: "emufw",
      inputFile: null,
      sysExFile: null,
      convertProgress: 0,
      convertStatus: ""
    };
  },
  methods: {
    convert() {
      if (this.inputFile) {
        const sysExTypeMap = {
          application: sysExTypes.uploadApplication,
          bootloader: sysExTypes.uploadBootloader,
          emufw: sysExTypes.uploadEmuFW,
          test: sysExTypes.test
        };
        const sysExType = sysExTypeMap[this.outputDataType];

        this.convertStatus = "Converting " + this.inputFile.name + "...";
        this.convertProgress = 0;
        this.convertDialog = true;

        const fileReader = new FileReader();
        const that = this;
        fileReader.onload = function() {
          const sysExData = sysExUtil.convertToSysEx(
            sysExType,
            true,
            512,
            new Uint8Array(fileReader.result)
          );

          // Calculate file size.
          let size = 0;
          for (let i = 0; i < sysExData.length; ++i) {
            size += sysExData[i].length;
          }

          // Flatten tracks in to a continous array.
          that.sysExFile = new Uint8Array(size);
          let offset = 0;
          for (let i = 0; i < sysExData.length; ++i) {
            that.sysExFile.set(sysExData[i], offset);
            offset += sysExData[i].length;
          }

          // Done converting.
          that.convertProgress = 100;
          that.convertStatus = "Done converting";
          that.inputFile = null;
        };
        fileReader.readAsArrayBuffer(this.inputFile);
      }
    },
    downloadSysEx() {
      // Save SysEx file.
      saveAs(
        new Blob([this.sysExFile], {
          type: "application/octet-stream"
        }),
        "out.syx",
        { autoBom: false }
      );
      this.sysExFile = null;
      this.convertDialog = false;
    },
    onFileChange(file) {
      this.fileTest = file;

      const fileReader = new FileReader();
      const that = this;
      fileReader.onload = function() {
        const checksum = checksumUtil.calculateCRC(
          new Uint8Array(fileReader.result)
        );
        const id = that.checksums.find(x => x.value === checksum);
        if (id) {
          that.fileTest = id.text;
          that.outputDataType = id.type;
        } else {
          that.fileTest = checksum;
          that.outputDataType = id.type;
        }
      };
      fileReader.readAsArrayBuffer(this.fileTest);
    }
  }
};
</script>
