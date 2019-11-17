<template>
  <v-card class="mx-auto" max-width="600px">
    <v-card-title class="headline">PixieDust</v-card-title>
    <v-card-text>
      <p>A small utillity for converting files and uploading sysex files.</p>
      <p>Developed by Pixe Johan Anderson over a weekend.</p>
      <p>Made using the following wonderful tech:</p>
      <ul>
        <li v-for="(externalTech,index) in externalTechs" v-bind:key="index">
          <a :href="externalTech.url" target="_blank">{{ externalTech.name }}</a>
        </li>
      </ul>
      <p>Thanks for using this thing &lt;3</p>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "About",
  data() {
    return {
      externalTechs: [
        { name: "Vue.js", url: "https://vuejs.org/" },
        { name: "Vuetify", url: "https://vuetifyjs.org/" },
        { name: "Electron", url: "https://electronjs.org/" },
        {
          name: "Vue CLI Plugin Electron Builder",
          url: "https://nklayman.github.io/vue-cli-plugin-electron-builder/"
        },
        { name: "WebMidi.js", url: "https://github.com/djipco/webmidi" },
        { name: "axios", url: "https://github.com/axios/axios" }
      ]
    };
  }
};
</script>
