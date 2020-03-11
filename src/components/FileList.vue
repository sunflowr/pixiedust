<template>
  <v-container>
    <v-list tile dense max-height="30">
      <v-list-item v-for="(item, i) in items" :key="i">
        <v-list-item-icon>
          <v-icon v-text="item.icon"></v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title v-text="item.text"></v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
    <v-switch v-model="checkboxValue" :label="label"></v-switch>
  </v-container>
</template>

<script>
export default {
  name: "DataTypeCheckbox",
  props: {
    label: String,
    value: Boolean
  },
  data() {
    return {
      items: [
        { text: "My Files", icon: "mdi-folder" },
        { text: "Shared with me", icon: "mdi-account-multiple" },
        { text: "Starred", icon: "mdi-star" },
        { text: "Recent", icon: "mdi-history" },
        { text: "Offline", icon: "mdi-check-circle" },
        { text: "Uploads", icon: "mdi-upload" },
        { text: "Backups", icon: "mdi-cloud-upload" }
      ]
    };
  }
};
</script>
