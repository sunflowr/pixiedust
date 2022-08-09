<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card class="mx-auto" max-width="600px">
          <v-card-title class="headline">PixieDust</v-card-title>
          <v-card-text>
            <p>A small utility for converting files and uploading sysex files.</p>
            <p>Developed by Pixie Johan Anderson over a weekend.</p>
            <p>Made using the following wonderful tech:</p>
            <ul>
              <li v-for="(externalTech,index) in externalTechs" v-bind:key="index">
                <a :href="externalTech.url" target="_blank">{{ externalTech.name }}</a>
              </li>
            </ul>
            <p>Thanks for using this thing &lt;3</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-card class="mx-auto" max-width="660px">
          <v-card-title class="headline">License</v-card-title>
          <v-card-text>
            <pre>
Copyright 2019 Pixie Johan Anderson

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
      </pre>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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
