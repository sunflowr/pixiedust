<template>
  <v-container fluid>{{ $route.params.id }}</v-container>
</template>

<script>
export default {
  name: "DeviceBackup",
  components: {},
  data() {
    return {};
  },
  /* eslint-disable no-unused-vars */
  /* eslint-disable no-console */
  beforeRouteUpdate(to, from, next) {
    console.log("DeviceBackup:");
    console.log(to);
    console.log(from);
    next();
  }
  /* eslint-enable no-console */
  /* eslint-enable no-unused-vars */
};
</script>
