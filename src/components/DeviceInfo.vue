<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">
      <div>RE-CPU info</div>
      <v-spacer />
      <v-btn color="secondary" x-small :loading="syncing" @click="syncDeviceInfo">
        <v-icon left>mdi-refresh</v-icon>Sync
      </v-btn>
    </v-card-title>
    <v-card-subtitle></v-card-subtitle>
    <v-card-text>
      <div>{{ receiveStatus }}</div>
      <div>{{ uploadStatus }}</div>
      <div v-if="deviceInfo2">
        <ul>
          <li>Hardware id: {{ deviceInfo2.version.hwid }}</li>
          <li>App Version: {{ deviceInfo2.version.major }}.{{ deviceInfo2.version.minor }}.{{ deviceInfo2.version.patch }}</li>
          <li>App Name: {{ deviceInfo2.version.name }}</li>
        </ul>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { sysExUtil } from "@/plugins/sysexutil";

export default {
  name: "DeviceInfo",
  props: {
    deviceInfo: Object
  },
  data() {
    return {
      syncing: false,
      uploadStatus: "",
      receiveStatus: "",
      deviceInfo2: null
    };
  },
  mounted() {
    if (this.midiInDevice) {
      this.midiInDevice.addListener("sysex", undefined, this.onSysExReceive);
    }
  },
  computed: {
    settings: {
      get() {
        return this.$Settings;
      }
    },
    midiOutDevice: {
      get() {
        if (this.$MIDI && this.$MIDI.webMidi) {
          return this.$MIDI.webMidi.getOutputById(
            this.settings.midiOutputDevice
          );
        }
        return null;
      }
    },
    midiInDevice: {
      get() {
        if (this.$MIDI && this.$MIDI.webMidi) {
          return this.$MIDI.webMidi.getInputById(this.settings.midiInputDevice);
        }
        return null;
      }
    }
  },
  methods: {
    syncDeviceInfo() {
      this.syncing = true;

      this.uploadSysEx([new Uint8Array([0x03, 0x03, 0x7c, 0x01])]);
    },
    uploadSysEx(sysExDataTracks) {
      this.delayUploadSysEx(this.settings.uploadDelay, sysExDataTracks, 0);
    },
    delayUploadSysEx(delayMs, tracks, currentTrack) {
      if (this.midiOutDevice && currentTrack < tracks.length) {
        this.midiOutDevice.sendSysex(0x7d, Array.from(tracks[currentTrack]));
        setTimeout(() => {
          this.delayUploadSysEx(delayMs, tracks, currentTrack + 1);
        }, delayMs);
      } else {
        if (!this.midiOutDevice) {
          this.uploadStatus = "No active midi output device, aborting!";
        } else {
          this.uploadStatus = "";
        }
        this.syncing = false;
      }
    },
    onSysExReceive(e) {
      const sdata = e.data.slice(7, e.data.length - 1);
      if (sdata.length % 2 != 0) {
        this.receiveStatus =
          "SysEx data length is uneven, the received data is most likely corrupt.";
        return;
      }

      const data = sysExUtil.denibbelize(sdata);
      if (data.length > 1) {
        const checksum = data[data.length - 1];

        // Verify data using checksum.
        let dataChecksum = 0;
        for (let j = 0; j < data.length - 1; ++j) {
          dataChecksum = (dataChecksum + data[j]) & 0xff; // Expected to be a UInt8 value.
        }

        if (checksum != dataChecksum) {
          this.receiveStatus = "Error when reciving, data is corrupt.";
        }

        this.uploadStatus = data;

        let i = 0;
        const ver = {};
        ver.magic =
          (data[i++] << 24) | (data[i++] << 16) | (data[i++] << 8) | data[i++]; // UInt32
        ver.hwid =
          (data[i++] << 24) | (data[i++] << 16) | (data[i++] << 8) | data[i++]; // UInt32
        ver.name = new TextDecoder("utf-8").decode(data.slice(i, i + 24)); // char[24]
        i += 24;
        ver.major = data[i++]; // UInt8
        ver.minor = data[i++]; // UInt8
        ver.patch = data[i++]; // UInt8
        ver.revision = data[i++]; // UInt16
        this.deviceInfo2 = {
          version: ver
        };
      }
    }
  }
};
</script>
