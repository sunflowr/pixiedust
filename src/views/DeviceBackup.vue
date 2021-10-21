<template>
  <v-container fluid>
    <v-alert
      icon="mdi-alert"
      border="left"
      type="warning">This functionality is currently a work in progress and should not be used!</v-alert>
    <v-alert v-if="errorMessage"
      icon="mdi-alert"
      border="left"
      type="error">{{ errorMessage }}</v-alert>
    <v-row v-if="idString === 'sync'">
      <v-col>
        <v-card>
          <v-card-title>
            <v-text-field
              label="Name"
              solo-inverted
            ></v-text-field>
          </v-card-title>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
            <v-btn @click="$emit('device:request-backup')">Request Backup</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="!!currentBackup">
      <v-col>
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col cols="2" sm="2">
                <v-select v-model="patternGroup" :items="patternGroups" item-text="label" item-value="value" label="Pattern Group"></v-select>
              </v-col>
              <v-col cols="2" sm="2">
                <v-select v-model="patternSection" :items="patternSections" item-text="label" item-value="value" label="Pattern Section"></v-select>
              </v-col>
              <v-col cols="2" sm="2">
                <v-select v-model="pattern" :items="patterns" label="Pattern"></v-select>
              </v-col>
            </v-row>
          </v-card-title>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
            <piano-roll :backupFile="currentBackup" :patternGroup="patternGroup" :patternSection="patternSection" :pattern="pattern" @mouse-move="onMouseMove" @mouse-down="onMouseDown" @mouse-up="onMouseUp" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="!!currentBackup">
      <v-col cols="8">
        <v-card>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
            <v-data-table dense fixed-header disable-sort single-select :headers="hexHeader" :items="hexData">
              <template v-slot:item="{ item, index }">
                <tr cols="12">
                  <td cols="12" width="20%" sm="2">{{  "0x" + ((index * 8) >>> 0).toString(16).padStart(4, '0') }}</td>
                  <td cols="12" width="10%" sm="1" v-for="offset in 8" :key=offset>
                    <v-text-field v-if="editIndex === ((offset - 1) + (index * 8))"
                      :label="item.d[offset].toString(16)"
                      :hide-details="true"
                      @focus="$event.target.select()"
                      @blur="editIndex = -1"
                      @keyup.enter="$event.target.blur()"
                      @change="updateBackupData($event, (offset - 1) + (index * 8))"
                      autofocus
                      dense
                      single-line></v-text-field>
                    <span v-else @click="editIndex=((offset - 1) + (index * 8))">{{ byteToString(item.d[offset]) }}</span>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card>
          <v-card-title>
            <v-text-field
              v-model="currentBackupName"
              label="Name"
              solo-inverted
            ></v-text-field>
          </v-card-title>
          <v-card-text style="font-family: monospace" v-if="!!hexData">
            <v-btn @click="$emit('device:restore-backup', currentBackup)">Upload</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from "vuex";
import PianoRoll from "@/components/PianoRoll/PianoRoll.vue";

export default {
  name: "DeviceBackup",
  components: { PianoRoll },
  props: {
    id: {
      type: Number,
      default: 0
    },
    idString: String
  },
  data() {
    return {
      rules: {
        byteValue: value => Number.isInteger(value) || 'Required'
      },
      errorMessage: null,
      currentBackup: null,
      editIndex: -1,
      hexHeader: [
        { text: "Address", value: "address", align: "start", divider: true, width: "100" },
        { text: "0x00", value: "d[0]", align: "start" },
        { text: "0x01", value: "d[1]", align: "start" },
        { text: "0x02", value: "d[2]", align: "start" },
        { text: "0x03", value: "d[3]", align: "start" },
        { text: "0x04", value: "d[4]", align: "start" },
        { text: "0x05", value: "d[5]", align: "start" },
        { text: "0x06", value: "d[6]", align: "start" },
        { text: "0x07", value: "d[7]", align: "start" },
      ],
      //hexData: [],
      patternGroups: [
        { value: 0, label: "I" },
        { value: 2, label: "II" },
        { value: 4, label: "III" },
        { value: 6, label: "IV" },
        //0, 1, 2, 3, 4, 5, 6
      ],
      patternSections: [ { value: 0, label: "A" }, { value: 1, label: "B" } ],
      patterns: [ 0, 1, 2, 3, 4, 5, 6, 7 ],
      patternGroup: 0,
      patternSection: 0,
      pattern: 0,
    };
  },
  /* eslint-disable no-console */
  mounted() {
    console.log("DeviceBackup:mounted");
    console.log(this.id);
    if(this.idString === "sync") {
      this.syncFromDevice();
    } else {
      this.openBackupFile(this.id);
    }
  },
  watch: {
    id() {
      if(this.idString === "sync") {
        this.syncFromDevice();
      } else {
        this.openBackupFile(this.id);
      }
    }
  },
  computed: {
    ...mapGetters(["settings"]),
    ...mapGetters(["device"]),
    ...mapGetters(["backupFiles"]),
    midiInDevice() {
      return this.$MIDI?.webMidi?.getInputById(this.settings.midiInputDevice) ?? null;
    },
    midiOutDevice() {
      return this.$MIDI?.webMidi?.getOutputById(this.settings.midiOutputDevice) ?? null;
    },
    currentBackupName: {
      get() {
        return this.currentBackup.name;
      },
      set(value) {
        if(value !== this.currentBackup.name) {
          this.$store.dispatch("renameBackupFile", {
            file: this.currentBackup,
            name: value,
          });
        }
      },
    },
    hexData() {
      if(!this.currentBackup)
      {
        return [];
      }
      // Create hex view.
      const dataPerLine = 8;
      const data = this.currentBackup.data;
      const hexData = [];
      let line = 0;
      for (let i = 0; i < data.length; ++i) {
        if ((i % dataPerLine) === 0) {
          line = hexData.length;
          hexData.push({ address: i >>> 0, d: [] })
        }
        hexData[line].d[i % 8] = data[i] >>> 0;
      }
      console.log("updated");
      return hexData;
    }
  },
  methods: {
    syncFromDevice() {
      this.errorMessage = null;
      this.currentBackup = null;
    },
    openBackupFile(id) {
      /*if (
        (!this.currentBackup || this.currentBackup.data.length == 0) &&
        this.backupFiles.length > 0
      ) {
        this.openBackupFile(0);
      }*/
      if (Number.isInteger(id)) {
        if((id >= 0) && (id < this.backupFiles.length)) {
          this.errorMessage = null;
          this.currentBackup = this.backupFiles[id];
        } else {
          this.errorMessage = "Backup not found";
          return;
        }
      } else {
        this.errorMessage = null;
        this.currentBackup = { name: "new", data: new Uint8Array() };
        console.log("new backup");
        console.log(id);
        console.log(this.backupFiles);
      }

      // Create hex view.
      /*const data = this.currentBackup.data;
      let line = 0;
      for (let i = 0; i < data.length; ++i) {
        if (i % 8 === 0) {
          line = this.hexData.length;
          this.hexData.push({ address: "0x" + (i >>> 0).toString(16).padStart(4, '0'), data: "" })
        }
        this.hexData[line][`data${(i % 8).toString(16).toLowerCase()}`] = "0x" + (data[i] >>> 0).toString(16).padStart(2, '0');
      }*/
    },
    /* eslint-disable no-console */
    onMouseMove(evt) {
      console.log(evt);
    },
    onMouseDown(evt) {
      console.log(evt);
    },
    onMouseUp(evt) {
      console.log(evt);
    },
    byteToString(value) {
      return "0x" + (value >>> 0).toString(16).padStart(2, '0');
    },
    updateBackupData(e, index) {
      if((!this.currentBackup) || (index >= this.currentBackup.data.length))
      {
        return;
      }
      const val = parseInt(e, 16);
      if(!isNaN(val)) {
        return this.currentBackup.data[index] = val;
      }
    },
    /* eslint-enable no-console */
  }
};
</script>
