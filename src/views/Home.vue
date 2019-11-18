<script>
import axios from "axios";
import GitHubReleaseCard from "@/components/GitHubReleaseCard.vue";

export default {
  name: "Home",
  components: {
    GitHubReleaseCard
  },
  mounted() {
    this.sendReq("https://api.github.com/repos/sunflowr/recpu/releases", this.cpuReleasesInfo);
    this.sendReq("https://api.github.com/repos/sunflowr/pixiedust/releases", this.appReleasesInfo);
  },
  data() {
    return {
      cpuReleasesInfo: {
        errorMessage: "",
        releases: [],
        grandTotal: 0,
        success: true,
        empty: false
      },
      appReleasesInfo: {
        errorMessage: "",
        releases: [],
        grandTotal: 0,
        success: true,
        empty: false
      }
    };
  },
  methods: {
    sendReq: function(url, releaseInfo) {
      releaseInfo.empty = false;

      // get data using a promise with axios
      // the request url has the format base + /repos/:user/:repo/releases
      axios
        .get(url)
        .then(function(response) {
          var data = response.data;

          // the total of all the release downloads
          releaseInfo.grandTotal = 0;

          for (let i = 0; i < data.length; i++) {
            // total of a particular release version
            var total = 0;
            data[i].total = 0;

            for (let j = 0; j < data[i].assets.length; j++) {
              // add up the download counts of the individual
              // binary/packaged files for a particular release version
              total += parseInt(data[i].assets[j].download_count);
            }
            // add a new field to the data object
            data[i].total = total;
            releaseInfo.grandTotal += total;
          }
          releaseInfo.releases = data;

          // if we got this far that means the request was a success
          releaseInfo.success = true;
          if (response.data.length === 0) {
            // check if there are any releases for the repo
            releaseInfo.empty = true;
          }
        })
        .catch(function(error) {
          // if there's an error then the request was not a success
          releaseInfo.errorMessage = error.message;
          releaseInfo.success = false;
          releaseInfo.empty = false;
        });
    }
  }
};
</script>

<template>
  <v-container fluid>
    <v-row dense>
      <v-col cols="12">
        <v-card class="mx-auto" max-width="600px">
          <v-card-text>
            <p>Latest releases:</p>
            <h5 v-if="appReleasesInfo.grandTotal && success">Total Downloads: {{ appReleasesInfo.grandTotal.toLocaleString() }}</h5>
            <h5 v-if="!appReleasesInfo.success">No repository found</h5>
            <h5 v-if="appReleasesInfo.empty">No Releases</h5>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-for="(release, index) in cpuReleasesInfo.releases" :key="index" cols="12">
        <GitHubReleaseCard :index="index" :release="release" />
      </v-col>
    </v-row>
    <v-row dense>
      <v-col cols="12">
        <v-card class="mx-auto" max-width="600px">
          <v-card-text>
            <p>Latest releases:</p>
            <h5 v-if="appReleasesInfo.grandTotal && success">Total Downloads: {{ appReleasesInfo.grandTotal.toLocaleString() }}</h5>
            <h5 v-if="!appReleasesInfo.success">No repository found</h5>
            <h5 v-if="appReleasesInfo.empty">No Releases</h5>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-for="(release, index) in appReleasesInfo.releases" :key="index" cols="12">
        <GitHubReleaseCard :index="index" :release="release" />
      </v-col>
    </v-row>
  </v-container>
</template>
