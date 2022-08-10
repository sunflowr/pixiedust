<template>
  <v-container fluid>
    <DeviceNav
      :device="device"
      :loading="sysExResponsePromises.length > 0"
      :backupFiles="backupFiles"
      :activeBackupFile="activeBackupFile"
      @device:sync="syncDeviceInfo"
      @device:request-backup="requestDeviceBackup"
      @device:view-backup-file="(i) => this.activeBackupFile = i"
      @device:upload-backup-file="uploadDeviceBackup"
      @device:export-backup-file="exportBackupFile"
    />

    <v-alert v-if="receiveStatus.length !== 0"
      icon="mdi-alert"
      border="left"
      type="error">{{ receiveStatus }}</v-alert>

    <v-container fluid>
      <router-view
        :device="device"
        :disabled="sysExResponsePromises.length > 0"
        :loading="sysExResponsePromises.length > 0"
        :syncing="sysExResponsePromises.length > 0"
        @device:sync="syncDeviceInfo"
        @device:request-backup="requestDeviceBackup"
        @device:restore-backup="uploadDeviceBackup"
        @device:upload-settings="uploadSettings" />
    </v-container>

    <v-dialog v-model="uploadDialog" persistent max-width="640px">
      <v-card>
        <v-card-title class="headline">{{ uploadStatus }}</v-card-title>
        <v-container>
          <v-row>
            <v-col>
              <v-progress-linear :value="uploadProgress" height="10px" rounded striped indeterminate />
            </v-col>
          </v-row>
          <v-row justify="space-between">
            <v-col>
              <div class="text-center">
                <v-btn
                  color="primary"
                  :disabled="!!inputFile"
                  medium
                  @click="uploadDialog=false"
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
import { saveAs } from "file-saver";
import { PromiseQueue } from "@/plugins/PromiseQueue";
import DeviceNav from "@/components/DeviceNav.vue";
import { mapGetters } from "vuex";
import {
  sysExUploadDataTypes,
  SysExMessage_BeginUpload,
  SysExMessage_EndUpload,
  SysExMessage_Upload,
  SysExMessage_Ping,
  SysExMessage_Version
} from "@/SysExMessages";
import { Version } from "@/version";
import { Settings } from "@/settings";
import { sysExUtil } from "@/plugins/sysexutil";
import sysExHandler from "@/SysExHandler";
import { Schema } from "@/schema";
import settingsSchema from "@/assets/schemas/settings.json";
//import { checksumUtil } from "@/plugins/checksumutil";


class SysExRequestJob {
  constructor(sysExData, timeOutMs, evalCompleted, resolve, timeOutReject) {
    this._sysExData = sysExData;
    this._timeOutMs = timeOutMs;
    this._timeOutId = null;
    this._evalCompleted = evalCompleted;
    this._resolve = resolve;
    this._timeOutReject = timeOutReject;
  }

  get sysExData() { return this._sysExData; }
  get isCompleted() { return this._timeOutId === null; }

  start() {
    this.stop();
    this._timeOutId = setTimeout(() => {
      this.stop();
      this._timeOutReject(new Error("SysEx request timed out waiting on response."));
    }, this._timeOutMs);
  }
  
  stop() {
    if(this._timeOutId) {
      clearTimeout(this._timeOutId);
      this._timeOutId = null;
    }
  }

  evalCompleted(data) {
    return this._evalCompleted(data);
  }

  resolve() {
    this.stop();
    this._resolve();
  }
}

/*function arrayEquals(a, b) {
    if (!Array.isArray(a)) { return false; }
    if (!Array.isArray(b)) { return false; }
    if (a === b) { return true; }
    if ((!a) || (!b)) { return false; }
    if (a.length !== b.length) { return false; }
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false; }
    }
    return true;
}*/

export default {
  name: "Device",
  components: {
    DeviceNav,
  },
  data() {
    return {
      // TODO: Upgrade code, remove syncRequest.
      syncRequest: null,
      receiveStatus: "",
      pinger: null,
      uploadState: null,
      syncing: false,
      sysExRequests: new PromiseQueue(),
      sysExResponsePromises: [],
      activeRequest: null,
      settingsSchema: settingsSchema
    };
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
    deviceSettings() {
      if (this.device) {
        return this.device.settings;
      }
      return null;
    },
    // TODO: Fix upload status.
    uploadDialog() { return (this.sysExResponsePromises.length > 0) || (!this.sysExRequests.isEmpty) || (this.sysExRequests.isWorking); },
    inputFile() { return null; },
    uploadProgress() { return 0; },
    uploadStatus() { return "Syncing..."; },
    // END TODO
    activeBackupFile: {
      get() {
        if(this.$route.name === 'device-backup' && this.$route.params?.id) {
          return +this.$route.params.id
        }
        return 0;
      },
      /* eslint-disable no-unused-vars */
      set(value) {
        const routePath = "/device/backup/" + value;
        if (this.$route.path !== routePath) {
          this.$router.push(routePath);
        }
        /*const routePath = "/device/backup/" + value;
        if (this.$route.path !== routePath) {
          this.$router.push(routePath);
        }*/
      }
      /* eslint-enable no-unused-vars */
    }
  },
  mounted() {
    sysExHandler.addListener(SysExMessage_BeginUpload.headerPrefix, this.onBeginUpload);
    sysExHandler.addListener(SysExMessage_EndUpload.headerPrefix, this.onEndUpload);
    sysExHandler.addListener(SysExMessage_Upload.headerPrefix, this.onUpload);
    sysExHandler.addListener(SysExMessage_Ping.headerPrefix, this.onPing);

    // Deprecated message.
    sysExHandler.addListener(SysExMessage_Version.headerPrefix, this.onVersion);
    // TODO: OLD: sysExMessageDescs.DataResponse_Version.addListener(this.onVersion);

    // Test make sysex messages.
    /*console.log(SysExMessage_Ping.makeSysEx(0x1f));
    console.log(SysExMessage_BeginUpload.makeSysEx(1, 0xcafec0de, 0xdeadbeef));
    console.log(SysExMessage_Upload.makeSysEx(1, 2, new Uint8Array([1, 2, 3])));*/
  },
  beforeDestroy() {
    this.stopPing();
    sysExHandler.removeListener(this.onBeginUpload);
    sysExHandler.removeListener(this.onEndUpload);
    sysExHandler.removeListener(this.onUpload);
    sysExHandler.removeListener(this.onPing);

    // Deprecated message.
    sysExHandler.removeListener(this.onVersion);
  },
  methods: {
    // Deprecated message.
    // TODO: Upgrade code, remove syncRequest and syncRequest.receive
    onVersion(message) {
      if (this.syncRequest) {
        switch (this.syncRequest.receive++) {
          case 0:
            this.$store.dispatch("setDeviceBootloaderVersion", new Version(message.data));
            break;
          case 1:
            this.$store.dispatch("setDeviceAppVersion", new Version(message.data));
            break;
          default:
            this.clearSync();
            break;
        }
      }
    },
    /**
     * Called on start of a SysEx data upload.
     * @param {Uint8Array} sysExData - SysEx message.
     */
    onBeginUpload(sysExData) {
      const message = new SysExMessage_BeginUpload(sysExData);
      if(this.uploadState) {
        this.cancelUpload();
      }
      this.startUpload(message.dataType, message.totalPackages, message.checksum);
    },
    /* eslint-disable no-unused-vars */
    /**
     * Called on end of a SysEx data upload.
     * @param {Uint8Array} sysExData - SysEx message.
     */
    onEndUpload(sysExData) {
      // TODO: Handle end upload message.
    },
    /* eslint-enable no-unused-vars */
    /**
     * Called on during SysEx data upload.
     * @param {Uint8Array} sysExData - SysEx message.
     */
    onUpload(sysExData) {
      const message = new SysExMessage_Upload(sysExData);
      if(!this.uploadState) {
        this.startUpload(message.dataType, -1, -1);
      }
      if(message.dataType !== this.uploadState.dataType) {
        this.cancelUpload();
        throw new Error("Received a new SysEx upload message while already busy processing another upload message.")
      }

      if(message.packetIndex !== this.uploadState.packageCount) {
        this.cancelUpload();
        throw new Error("SysEx upload message received in wrong order.")
      }

      // Add upload message.
      this.uploadState.uploadMessages.push(message);

      // Append data.
      const tmpBuffer = new Uint8Array(this.uploadState.data.length + message.data.length);
      tmpBuffer.set(this.uploadState.data);
      tmpBuffer.set(message.data, this.uploadState.data.length);
      this.uploadState.data = tmpBuffer;

      this.uploadState.packageCount++;

      if( ((this.uploadState.totalPackages < 0) && (message.data.length === 0)) ||
          (this.uploadState.packageCount === this.uploadState.totalPackages)) {
        // Old way of uploading packages didn't use a BeginUpload to specify number of packages,
        // instead it used a message with length of 0 specify last message.
        this.endUpload();
      }
    },
    /**
     * Called on when receiving a ping response.
     * @param {Uint8Array} sysExData - SysEx message.
     */
    onPing(sysExData) {
      const message = new SysExMessage_Ping(sysExData);
      console.log("Ping: " + message.pingChallenge);
    },
    /**
     *  Starts a SysEx upload.
     * 
     * @param {number} dataType - Identifier of the data type being uploaded.
     * @param {number} totalPackages - Expected number of packages to be uploaded.
     * @param {number} checksum - The expected final checksum of all uploaded data.
     */
    startUpload(dataType, totalPackages, checksum, ) {
      this.uploadState = {
        dataType: dataType,
        packageCount: 0,
        totalPackages: totalPackages,
        checksum: checksum,
        uploadMessages: [],
        data: new Uint8Array(0)
      }
      switch(this.uploadState.dataType) {
        case sysExUploadDataTypes.bootloader: console.log("bootloader"); break;
        case sysExUploadDataTypes.application: console.log("application"); break;
        case sysExUploadDataTypes.emulatorFirmware: console.log("emulatorFirmware"); break;
        case sysExUploadDataTypes.settings: console.log("settings"); break;
        case sysExUploadDataTypes.memoryDump: console.log("memoryDump"); break;
        default: console.log("Unknown data type.");
      } 
    },
    /** Cancels a SysEx upload and reset upload states. */
    cancelUpload() {
      // TODO: Implement cancellation of upload.
      delete this.uploadState;
    },
    /** Ends a SysEx upload and verify it. */
    endUpload() {
      if(!this.uploadState) {
        throw new Error("No upload was started.")
      }
      if(this.uploadState.totalPackages < 0) {
        // Old way of uploading packages didn't use a BeginUpload to specify number of packages.
        // TODO: Handle errors.
      }
      else
      {
        if(this.uploadState.packageCount !== this.uploadState.totalPackages) {
          throw new Error("Upload was incomplete.")
        }
        if(!SysExMessage_BeginUpload.verifyPackagesChecksum(this.uploadState.checksum, this.uploadState.data)) {
          throw new Error("Upload was incomplete.")
        }
      }

      this.uploadReceived(this.uploadState.dataType, this.uploadState.data);
      delete this.uploadState;
    },
    uploadReceived(dataType, data) {
      /* eslint-disable no-console */
      console.log("Data received:");
      console.log(dataType);
      console.log(data);
      /* eslint-enable no-console */
      switch(dataType) {
      case sysExUploadDataTypes.bootloader:
        this.$store.dispatch("setDeviceBootloaderVersion", new Version(data));
        break;
      case sysExUploadDataTypes.application:
        this.$store.dispatch("setDeviceAppVersion", new Version(data));
        //this.startPing(true);
        break;
      case sysExUploadDataTypes.settings:
        this.$store.dispatch("setDeviceSettings", new Settings(data));
        break;
      case sysExUploadDataTypes.memoryDump:
        this.$store.dispatch("addBackupFile", {
          name: `Backup ${this.backupFiles.length}`,
          data: Array.from(data), // Need to be vanilla array due to localstorage.
        });
        break;
      }

      this.processResponse({dataType: dataType});
    },
    upload(sysExData) {
      if ((this.$MIDI?.webMidi ?? false) === false) {
        throw new Error("No WebMIDI.");
      }
      return this.sysExRequests.queue(() => new Promise((resolve, reject) => {
        this.receiveStatus = "";
        for(let i = 0; i < sysExData.length; ++i) {
          this.$MIDI.sendSysExAsync(this.midiOutDevice, sysExData[i], () => {}).catch(reject);
        }
        resolve();
      }));
    },
    sync(sysExData, timeOutMs, evalCompleted) {
      if ((this.$MIDI?.webMidi ?? false) === false) {
        throw new Error("No WebMIDI.");
      }
      return this.sysExRequests.queue(() => new Promise((resolve, reject) => {
        this.receiveStatus = "";
        this.$MIDI.sendSysExAsync(this.midiOutDevice, sysExData, () => {
          const job = new SysExRequestJob(sysExData, timeOutMs, evalCompleted, resolve, reject);
          this.sysExResponsePromises.push(job);
          job.start();
        });
      }));
    },
    clearSync() {
        this.sysExRequests.stop();
        for(let o of this.sysExResponsePromises) {
          o.stop();
        }
        this.sysExResponsePromises = [];
    },
    abortSync(errorMessage) {
      this.clearSync();
      this.receiveStatus = errorMessage;
      this.receiveStatus = "No RE-CPU detected, please check MIDI device settings and connection.";
    },
    processResponse(data) {
      for(let i = 0; i < this.sysExResponsePromises.length; ++i) {
        const sysExResponsePromise = this.sysExResponsePromises[i];
        if(sysExResponsePromise.evalCompleted(data)) {
          this.sysExResponsePromises.splice(i);
          sysExResponsePromise.resolve();
          return;
        }
      }
    },
    syncDeviceInfo() {
      this.$store.dispatch("clearDevice");
      this.sync(new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.bootloader]), 5000, data => data.dataType === sysExUploadDataTypes.bootloader)
      // TODO: Catch and try old version message.
      //.catch(err => this.sync(new Uint8Array([0x03, 0x03, 0x4d, sysExUploadDataTypes.bootloader]), 5000, data => data.dataType === sysExUploadDataTypes.bootloader))
      .then(() => this.sync(new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.application]), 5000, data => data.dataType === sysExUploadDataTypes.application))
      .then(() => this.sync(new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.settings]), 5000, data => data.dataType === sysExUploadDataTypes.settings))
      //.then( PING ) SysExMessage_Ping.makeSysEx(0x1f).slice(2, -1),
      .catch(err => { this.abortSync(err.message); });
    },
    syncSettings() {
      if (!this.device) {
        // TODO: Sync first if no device is present.
        return;
      }
      this.sync(new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.settings]), 5000, data => data.dataType === sysExUploadDataTypes.settings)
      .catch(err => { this.abortSync(err.message); });
    },
    requestDeviceBackup() {
      if (!this.device) {
        // TODO: Sync first if no device is present.
        return;
      }
      this.sync(new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.memoryDump]), 5000, data => data.dataType === sysExUploadDataTypes.memoryDump)
      .catch(err => { this.abortSync(err.message); });

      /*const routePath = "/device/backup/sync";
      if (this.$route.path !== routePath) {
        this.$router.push(routePath);
      }*/
    },
    startPing(restartPing = false) {
      if(restartPing && this.pinger) {
        this.stopPing();
      }
      if (!this.pinger) {
        const that = this;
        this.pinger = setInterval(() => {
          // Ping.
          this.$MIDI.sendSysEx(this.midiOutDevice, [SysExMessage_Ping.makeSysEx(0x1f).slice(2, -1)], 2000,
            () => {
              // Progress.
            },
            () => {
              // Resolve.
            },
            (error) => {
              // Reject.
              that.clearSync();
              that.receiveStatus = error;
            }
          );
        }, 10000);
      }
    },
    stopPing() {
      if(this.pinger) {
        clearInterval(this.pinger);
        this.pinger = null;
      }
    },
    uploadSettings() {
      if((!this.device) || (!this.deviceSettings)) {
        // TODO: Sync first if no device is present.
        return;
      }

      const settingsData = Schema.serialize(this.settingsSchema, Schema.getVersionString(this.deviceSettings), this.deviceSettings);
      const sysExData = sysExUtil.convertToSysEx(sysExUploadDataTypes.settings, false, 512, settingsData, false);
      this.upload(sysExData)
          .catch(err => { this.abortSync(err.message); })
    },
    uploadDeviceBackup(fileIndex = undefined) {
      if(!fileIndex) {
        fileIndex = this.activeBackupFile;
      }
      const syxExData = sysExUtil.convertToSysEx(sysExUploadDataTypes.memoryDump, false, 512, this.backupFiles[fileIndex].data, false);
      this.upload(syxExData)
          .catch(err => { this.abortSync(err.message); });

    },
    exportBackupFile(fileIndex) {
      const file =this.backupFiles[fileIndex];
      const exportSysEx = true;

      const exportData = [];
      if(exportSysEx) {
        //console.log(SysExMessage_BeginUpload.makeSysEx(sysExUploadDataTypes.memoryDump, 7, checksumUtil.calculateCRC(file.data)));
        const syxExTracks = sysExUtil.convertToSysEx(sysExUploadDataTypes.memoryDump, true, 512, file.data, false);
        let data = new Uint8Array(0);
        for(let i = 0; i < syxExTracks.length; ++i) {
          const data2 = new Uint8Array(data.length + syxExTracks[i].length);
          data2.set(data);
          data2.set(syxExTracks[i], data.length);
          data = data2;
        }
        console.log(data);
        exportData.push(new Uint8Array(data));
      } else {
        exportData.push(new Uint8Array(file.data));
      }

      // TODO: Better sanitization of filenames when exporting.
      const filename = file.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() + (exportSysEx ? ".syx" : ".bin");
      saveAs(new Blob(exportData, { type: "application/octet-stream" }), filename, { autoBom: false }
      );
    }
  },
};
</script>
