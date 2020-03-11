<template>
  <v-switch v-model="checkboxValue" :label="label"></v-switch>
</template>

<script>
export default {
  name: "DataTypeCheckbox",
  props: {
    label: String,
    value: Boolean
  },
  computed: {
    checkboxValue: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("value-changed", value);
        //this.$store.dispatch("setMidiPort", value);
      }
    }
  }
};
</script>
