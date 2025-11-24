import { createRouter, createWebHistory } from "vue-router";

import ChateBox from '../components/ChatBox.vue'
import DataSet from '../components/DataSet.vue'
import AboutUs from '../components/AboutUs.vue'

import SignedUp from '../components/SignedUp.vue'
import { auth } from "../firebase";

const routes = [
	{
		path: '/',
		name: 'ChateBox',
		component: ChateBox,
		meta: { requiresAuth: true },
	},
	{
		path: '/dataset',
		name: 'DataSet',
		component: DataSet
	},
	{
		path: '/aboutus',
		name: 'AboutUs',
		component: AboutUs
	},
	{
		path: '/signedup',
		name: 'SignedUp',
		component: SignedUp
	}
]

const router = createRouter({
	history: createWebHistory('http://localhost:5173/'),
	routes
})

router.beforeEach((to, from, next) => {
	const user = auth.currentUser;
	if (to.meta.requiresAuth && !user) {
	  next("/signedup");
	} else {
	  next();
	}
  });

export default router