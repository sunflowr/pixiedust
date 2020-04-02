import Vue from 'vue'
import Vuex from 'vuex'
//import { Version } from "@/version";
//import { Settings } from "@/settings";

Vue.use(Vuex)

const STORAGE_KEY = 'pixiedust';
const DEFAULT_SETTINGS = {
  midiInputDevice: null,
  midiOutputDevice: null,
  midiPort: 1,
  uploadDelay: 250
};

// TODO: Make disconnect state.
/*const DEFAULT_DEVICE = {
  bootloaderVersion: new Version(),
  appVersion: new Version(),
  settings: new Settings()
};*/

export default new Vuex.Store({
  state: {
    settings: JSON.parse(window.localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_SETTINGS)),
    device: null,
    backupFiles: []
  },
  getters: {
    settings(state) {
      if (!state.settings) {
        return DEFAULT_SETTINGS;
      }
      return state.settings;
    },
    device(state) {
      return state.device;
    },
    backupFiles(state) {
      return state.backupFiles;
    }
  },
  mutations: {
    updateSettings: (state, settings) => {
      state.settings = settings;
    },
    updateDevice: (state, device) => {
      state.device = device;
    },
    updateBackupFiles: (state, backupFiles) => {
      state.backupFiles = backupFiles;
    },
    removeBackupFile: (state, backupFile) => {
      const index = state.backupFiles.indexOf(backupFile);
      if(index >= 0){
        state.backupFiles.splice(index, 1);
      }
    },
    renameBackupFile: (state, payload) => {
      const index = state.backupFiles.indexOf(payload.file);
      if(index >= 0){
        state.backupFiles[index].name = payload.name;
      }
    }
  },
  /* eslint-disable no-unused-vars */
  actions: {
    setMidiInputDevice({ commit, state }, deviceId) {
      const settings = { ...state.settings, midiInputDevice: deviceId };
      commit('updateSettings', settings);
    },
    setMidiOutputDevice({ commit, state }, deviceId) {
      const settings = { ...state.settings, midiOutputDevice: deviceId };
      commit('updateSettings', settings);
    },
    setMidiPort({ commit, state }, port) {
      port = Math.min(Math.max(port, 1), 16);
      const settings = { ...state.settings, midiPort: port };
      commit('updateSettings', settings);
    },
    setMidiUploadDelay({ commit, state }, uploadDelay) {
      uploadDelay = Math.max(uploadDelay, 1);
      const settings = { ...state.settings, uploadDelay: uploadDelay };
      commit('updateSettings', settings);
    },
    clearDevice({ commit, state }) {
      commit('updateDevice', null);
    },
    setDeviceBootloaderVersion({ commit, state }, version) {
      const device = { ...state.device, bootloaderVersion: version };
      commit('updateDevice', device);
    },
    setDeviceAppVersion({ commit, state }, version) {
      const device = { ...state.device, appVersion: version };
      commit('updateDevice', device);
    },
    setDeviceSettings({ commit, state }, settings) {
      const device = { ...state.device, settings: settings };
      commit('updateDevice', device);
    },
    addBackupFile({ commit, state }, backupFile) {
      const backupFiles = [...state.backupFiles, backupFile];
      commit('updateBackupFiles', backupFiles);
    },
    removeBackupFile({ commit, state }, backupFile) {
      commit('removeBackupFile', backupFile);
    },
    renameBackupFile({ commit, state }, payload) {
      commit('renameBackupFile', payload);
      //const backupFiles = { ...state.backupFiles, backupFiles: backupFiles }
      //commit('updateBackupFiles', backupFiles);
    }
  },
  /* eslint-enable no-unused-vars */
  modules: {
  }
});
