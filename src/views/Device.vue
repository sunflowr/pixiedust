<template>
  <v-container fluid>
    <DeviceNav
      :device="device"
      :loading="!!syncRequest"
      :syncRequest="syncRequest"
      :backupFiles="backupFiles"
      :activeBackupFile="activeBackupFile"
      @device:sync="syncDeviceInfo"
      @device:request-backup="requestDeviceBackup"
      @device:view-backup-file="(i) => activeBackupFile = i"
    />

    <v-alert v-if="receiveStatus.length !== 0"
      icon="mdi-alert"
      border="left"
      type="error">{{ receiveStatus }}</v-alert>

    <v-container fluid>
      <router-view
        :device="device"
        :disabled="!!syncRequest"
        :loading="!!syncRequest"
        :syncing="!!syncRequest"
        @device:sync="syncDeviceInfo" />
    </v-container>
  </v-container>
</template>

<script>
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
import sysExHandler from "@/SysExHandler";

export default {
  name: "Device",
  components: {
    DeviceNav,
  },
  data() {
    return {
      syncRequest: null,
      receiveStatus: "",
      pinger: null,
      uploadState: null
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
            this.clearSyncRequest();
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

      if( ((this.uploadState.totalPackages < 0) && (message.data.length == 0)) ||
          (this.uploadState.packageCount === this.uploadState.totalPackages)) {
        // Old way of uploading packages didn't use a BeginUpload to specify number of packages,
        // instead it used a message with length of 0 specify last message.
        this.endUpload();
      }
    },
    /**
     * Called on when reciving a ping response.
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
        uploadMessages: new Array(),
        data: new Uint8Array()
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
      // TODO: Implement cancelation of upload.
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

      this.uploadRecived(this.uploadState.dataType, this.uploadState.data);
      delete this.uploadState;
    },
    uploadRecived(dataType, data) {
      /* eslint-disable no-console */
      console.log("Data recived:");
      console.log(dataType);
      console.log(data);
      /* eslint-enable no-console */
      switch(dataType) {
      case sysExUploadDataTypes.bootloader:
        this.$store.dispatch("setDeviceBootloaderVersion", new Version(data));
        break;
      case sysExUploadDataTypes.application:
        this.$store.dispatch("setDeviceAppVersion", new Version(data));
        this.startPing(true);
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
    },
    // TODO: Use this.clearSyncRequest(); when received data.
    makeSyncRequest(sysExTracks, timeoutMS) {
      if (this.syncRequest) {
        return;
      }
      const that = this;
      if (this.$MIDI && this.$MIDI.webMidi) {
        this.syncRequest = {
          tracks: sysExTracks,
          timeout: setTimeout(this.onSyncTimedOut, timeoutMS),
          receive: 0,
        };
        this.$MIDI.sendSysEx(
          this.midiOutDevice,
          this.syncRequest.tracks,
          this.settings.uploadDelay,
          () => {
            // Progress.
          },
          () => {
            // Resolve.
          },
          (error) => {
            // Reject.
            that.receiveStatus = error;
            that.clearSyncRequest();
          }
        );
      }
    },
    onSyncTimedOut() {
      if (this.syncRequest) {
        this.receiveStatus = "No RE-CPU detected, plesae check MIDI device settings and connection.";
      }
      this.clearSyncRequest();
    },
    clearSyncRequest() {
      if (this.syncRequest) {
        clearTimeout(this.syncRequest.timeout);
        this.syncRequest = null;
      }
    },
    syncDeviceInfo() {
      this.$store.dispatch("clearDevice");
      this.makeSyncRequest([
          new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.bootloader]),
          new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.application]),
          new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.settings]),
          SysExMessage_Ping.makeSysEx(0x1f).slice(2, -1),
        ], 2000);
    },
    syncSettings() {
      if (!this.device) {
        return;
      }
      this.makeSyncRequest([
          new Uint8Array([0x03, 0x03, 0x7d, sysExUploadDataTypes.settings]),
        ], 2000);
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
              that.receiveStatus = error;
              that.clearSyncRequest();
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
    requestDeviceBackup() {
      const routePath = "/device/backup";
      if (this.$route.path !== routePath) {
        this.$router.push(routePath);
      }
    },
  },
};
</script>
