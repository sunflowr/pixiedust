import 'typeface-roboto/index.css'
import '@mdi/font/css/materialdesignicons.css'
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
//import colors from "vuetify/es5/util/colors";
//ctx.fillStyle = colors.blueGrey.darken1; // "rgb(40,40,40";

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        dark: true,
        themes: {
            light: {
                columnDark: '#dfdfdf',
                columnLight: '#dbdbdb',
                inactiveColumnDark: '#cfcfcf',
                inactiveColumnLight: '#cbcbcb',
                cellSeparator: '#d0d0d0',
                octaveSeparator: '#3E3E3E',
                noteColor: '#19B5E6',
                selectedNoteStroke: '#ffffff'
            },
            dark: {
                columnDark: '#202020',
                columnLight: '#242424',
                inactiveColumnDark: '#101010',
                inactiveColumnLight: '#141414',
                cellSeparator: '#2F2F2F',
                octaveSeparator: '#3E3E3E',
                noteColor: '#E64A19',
                selectedNoteStroke: '#ffffff'
            }
        }
    },
    icons: {
        iconfont: 'mdi'
    }
});
