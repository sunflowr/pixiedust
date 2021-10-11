<template>
  <v-container fluid>
    <DeviceNav
      :device="device"
      :loading="!!syncRequest"
      :syncRequest="syncRequest"
      :backupFiles="backupFiles"
      @device:sync="syncDeviceInfo"
    />

    <v-container fluid>
      <router-view
        :device="device"
        :loading="!!syncRequest"
        :syncing="!!syncRequest"
        @device:sync="syncDeviceInfo" />
    </v-container>
  </v-container>
</template>

<script>
import DeviceNav from "@/components/DeviceNav.vue";
import { mapGetters } from "vuex";
import { SysExMessage_BeginUpload, SysExMessage_Upload, SysExMessage_Ping, sysExMessageDescs } from "@/SysExMessages";
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
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getInputById(this.settings.midiInputDevice);
      }
      return null;
    },
    midiOutDevice() {
      if (this.$MIDI && this.$MIDI.webMidi) {
        return this.$MIDI.webMidi.getOutputById(this.settings.midiOutputDevice);
      }
      return null;
    },
  },
  mounted() {
    sysExMessageDescs.DataResponse_Version.addListener(this.onVersion);
    sysExMessageDescs.DataResponse_Settings.addListener(this.onSettings);
    sysExMessageDescs.DataResponse_MemoryDump.addListener(this.onMemoryDump);

    sysExHandler.addListener(SysExMessage_BeginUpload.headerPrefix, this.onBeginUpload);
    sysExHandler.addListener(SysExMessage_Upload.headerPrefix, this.onUpload);
    sysExHandler.addListener(SysExMessage_Ping.headerPrefix, this.onPing);
    sysExMessageDescs.EndUpload.addListener(this.onEndUpload);

    // Test make sysex messages.
    /*console.log(SysExMessage_Ping.makeSysEx(0x1f));
    console.log(SysExMessage_BeginUpload.makeSysEx(1, 0xcafec0de, 0xdeadbeef));
    console.log(SysExMessage_Upload.makeSysEx(1, 2, new Uint8Array([1, 2, 3])));*/
  },
  beforeDestroy() {
    sysExMessageDescs.DataResponse_Version.removeListener(this.onVersion);
    sysExMessageDescs.DataResponse_Settings.removeListener(this.onSettings);
    sysExMessageDescs.DataResponse_MemoryDump.removeListener(this.onMemoryDump);

    sysExHandler.removeListener(this.onBeginUpload);
    sysExHandler.removeListener(this.onUpload);
    sysExHandler.removeListener(this.onPing);
    sysExMessageDescs.EndUpload.removeListener(this.onEndUpload);
  },
  methods: {
    onVersion(message) {
      if (this.syncRequest) {
        switch (this.syncRequest.receive++) {
          case 0:
            this.$store.dispatch(
              "setDeviceBootloaderVersion",
              new Version(message.data)
            );
            break;
          case 1:
            this.$store.dispatch(
              "setDeviceAppVersion",
              new Version(message.data)
            );
            break;
          default:
            this.clearSyncRequest();
            break;
        }
      }
    },
    onSettings(message) {
      if (this.syncRequest) {
        switch (this.syncRequest.receive++) {
          case 2:
            this.$store.dispatch(
              "setDeviceSettings",
              new Settings(message.data)
            );
            this.clearSyncRequest();
            break;
          default:
            this.clearSyncRequest();
            break;
        }
      }
    },
    onMemoryDump(message) {
      /* eslint-disable no-console */
      console.log("memory dump:");
      console.log(message.data);
      /* eslint-enable no-console */
      this.$store.dispatch("addBackupFile", {
        name: `Backup ${this.backupFiles.length}`,
        data: Array.from(message.data), // Need to be vanilla array due to localstorage.
      });
    },
    /* eslint-disable no-unused-vars */
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
    /**
     * Called on end of a SysEx data upload.
     * @param {Uint8Array} sysExData - SysEx message.
     */
    onEndUpload(sysExData) {},
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

      // TODO: Check for end of upload.
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
        case SysExMessage_Upload.dataTypes.bootloader: console.log("bootloader"); break;
        case SysExMessage_Upload.dataTypes.application: console.log("application"); break;
        case SysExMessage_Upload.dataTypes.emulatorFirmware: console.log("emulatorFirmware"); break;
        case SysExMessage_Upload.dataTypes.settings: console.log("settings"); break;
        case SysExMessage_Upload.dataTypes.memoryDump: console.log("memoryDump"); break;
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

      this.$store.dispatch("addUploadData", {
        dataType: this.uploadState.dataType,
        data: this.uploadState.data,
      });

      delete this.uploadState;
    },
    /* eslint-enable no-unused-vars */
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
        this.receiveStatus =
          "No RE-CPU detected, plesae check MIDI device settings and connection.";
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
      this.makeSyncRequest(
        [
          new Uint8Array([0x03, 0x03, 0x7c, 0x00]), // Bootloader version.
          new Uint8Array([0x03, 0x03, 0x7c, 0x01]), // Application version.
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]), // Settings.
          SysExMessage_Ping.makeSysEx(0x1f).slice(2, -1),
        ],
        2000
      );
    },
    syncSettings() {
      if (!this.device) {
        return;
      }
      this.makeSyncRequest(
        [
          new Uint8Array([0x03, 0x03, 0x7d, 0x02]), // Settings.
        ],
        2000
      );
    },
    startPing() {
      if (!this.pinger) {
        const that = this;

        this.pinger = setInterval(() => {
          // Ping.
          this.$MIDI.sendSysEx(
            this.midiOutDevice,
            [new Uint8Array([0x03, 0x03, 0x7a])],
            2000,
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
      clearInterval(this.pinger);
      this.pinger = null;
    },
  },
};
</script>
