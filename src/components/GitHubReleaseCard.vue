<template>
  <v-expansion-panel class="mx-auto" max-width="600px">
    <v-expansion-panel-header>{{release.tag_name}}</v-expansion-panel-header>
    <v-expansion-panel-content>
      <p>
        <a :href="release.html_url" target="_blank">View on GitGub</a>
      </p>
      <p v-html="releaseBody"></p>
      <v-card flat>
        <v-card-title class="headline">Files</v-card-title>
        <v-card-text>
          <v-simple-table>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="text-left">Name</th>
                  <th class="text-left">Downloads</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(asset, index) in release.assets" :key="index">
                  <td>
                    <a :href="asset.browser_download_url" target="_blank">{{ asset.name }}</a>
                  </td>
                  <td>{{ asset.download_count.toLocaleString() }}</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-card-text>
      </v-card>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import md from "markdown-it";

export default {
  name: "GitHubReleaseCard",
  props: {
    index: Number,
    release: Object
  },
  computed: {
    releaseBody() {
      return new md("default", {
        html: false,
        xhtml: false,
        typographer: true,
        linkify: false,
        breaks: false
      }).render(this.release.body);
    }
  }
};
</script>
