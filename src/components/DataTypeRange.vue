<template>
  <v-slider class="align-center" v-model="sliderValue" :min="min" :max="max" :label="label">
    <template v-slot:append>
      <v-text-field
        v-model="sliderValue"
        class="mt-0 pt-0"
        hide-details
        single-line
        type="number"
        style="width: 60px"
      ></v-text-field>
    </template>
  </v-slider>
</template>

<script>
export default {
  name: "DataTypeRange",
  props: {
    label: String,
    value: Number,
    min: Number,
    max: Number
  },
  computed: {
    sliderValue: {
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
