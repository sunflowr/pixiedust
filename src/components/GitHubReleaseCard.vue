<template>
  <v-card v-if="index < 5" class="mx-auto" max-width="600px">
    <v-card-title class="headline">
      <a :href="release.html_url" target="_blank">{{release.tag_name}}</a>
    </v-card-title>
    <v-card-subtitle>{{ release.total.toLocaleString() }} downloads</v-card-subtitle>
    <v-card-text>
      <p>{{ release.body }}</p>
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-header>Files</v-expansion-panel-header>
          <v-expansion-panel-content>
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
                    <td><a :href="asset.browser_download_url" target="_blank">{{ asset.name }}</a></td>
                    <td>{{ asset.download_count.toLocaleString() }}</td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "GitHubReleaseCard",
  props: {
      index: Number,
      release: Object
  }
};
</script>
