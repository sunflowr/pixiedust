import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        name: 'home',
        meta: {
            index: 0,
            icon: 'mdi-view-dashboard',
            title: 'Home',
            accelerator: "CmdOrCtrl+I"
        },
        component: Home
    },
    {
        path: '/device',
        name: 'device',
        meta: {
            index: 1,
            icon: 'mdi-view-dashboard',
            title: 'Device',
            accelerator: "CmdOrCtrl+R"
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/Device.vue')
    },
    {
        path: '/midiupload',
        name: 'midiupload',
        meta: {
            index: 2,
            icon: 'mdi-download',
            title: 'Send to device',
            accelerator: "CmdOrCtrl+U"
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/MidiUpload.vue')
    },
    {
        path: '/sysextool',
        name: 'sysextool',
        meta: {
            index: 3,
            icon: 'mdi-file-export',
            title: 'SysEx Tool',
            accelerator: "CmdOrCtrl+S"
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/SysExTool.vue')
    },
    {
        path: '/settings',
        name: 'settings',
        meta: {
            index: 4,
            icon: 'mdi-settings',
            title: 'Settings',
            accelerator: 'Cmd+,'
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/Settings.vue')
    },
    {
        path: '/about',
        name: 'about',
        meta: {
            index: 5,
            icon: 'mdi-information',
            title: 'About'
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
    }
]

const router = new VueRouter({
    routes
})

export default router
