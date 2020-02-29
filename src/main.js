import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import router from './router'
import WebMIDI from './plugins/midi/index';
import store from './store'

Vue.config.productionTip = false;

Vue.use(WebMIDI);

new Vue({
  vuetify,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
