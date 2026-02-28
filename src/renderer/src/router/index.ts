import { createRouter, createWebHashHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatView
    },
    {
      path: '/mcp',
      name: 'mcp',
      component: () => import('../views/McpView.vue')
    },
    {
      path: '/experts',
      name: 'experts',
      component: () => import('../views/ExpertsView.vue')
    },
    {
      path: '/skills',
      name: 'skills',
      component: () => import('../views/SkillsView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/shell',
      name: 'shell',
      component: () => import('../views/ShellView.vue')
    }
  ]
});

export default router;
