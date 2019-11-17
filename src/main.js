import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import router from './router'
import WebMIDI from './plugins/midi/index';
import Settings from './plugins/settings/index';

Vue.config.productionTip = false

Vue.use(WebMIDI);
Vue.use(Settings);

new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
