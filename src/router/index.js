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
            icon: 'mdi-home',
            title: 'Home'
        },
        component: Home
    },
    {
        path: '/device',
        meta: {
            index: 1,
            icon: 'mdi-alien',
            title: 'Device'
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "device" */ '../views/Device.vue'),
        children: [
            {
                path: '',
                name: 'device',
                component: () => import(/* webpackChunkName: "device-home" */ '../views/DeviceHome.vue'),
            },
            {
                path: 'settings',
                component: () => import(/* webpackChunkName: "device-settings" */ '../views/DeviceSettings.vue'),
            },
            //{
            //    path: 'backup',
            //    component: () => import(/* webpackChunkName: "device-backup" */ '../views/DeviceBackup.vue'),
            //},
            {
                name: "device-backup",
                path: 'backup/:id?',
                component: () => import(/* webpackChunkName: "device-backup" */ '../views/DeviceBackup.vue'),
                props(route) {
                    const props = { ...route.params };
                    if(props.id) {
                        props.id = +(props.id);
                    }
                    return props;
                }
            }

        ]
    },
    {
        path: '/midiupload',
        name: 'midiupload',
        meta: {
            index: 2,
            icon: 'mdi-download',
            title: 'Send to device'
        },
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '../views/MidiUpload.vue')
    },
    // Disabled: As it's not really needed and cause confusions and questions.
    //{
    //    path: '/sysextool',
    //    name: 'sysextool',
    //    meta: {
    //        index: 3,
    //        icon: 'mdi-file-export',
    //        title: 'SysEx Tool'
    //    },
    //    // route level code-splitting
    //    // this generates a separate chunk (about.[hash].js) for this route
    //    // which is lazy-loaded when the route is visited.
    //    component: () => import(/* webpackChunkName: "about" */ '../views/SysExTool.vue')
    //},
    {
        path: '/settings',
        name: 'settings',
        meta: {
            index: 4,
            icon: 'mdi-cog',
            title: 'Settings'
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
