import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

export const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue')
  },
  {
    path: '/dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/transactions',
    component: () => import('@/pages/TransactionsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/import',
    component: () => import('@/pages/ImportPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/recurring',
    component: () => import('@/pages/RecurringPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/categories',
    component: () => import('@/pages/CategoriesPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/review',
    component: () => import('@/pages/ReviewPage.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) {
    return '/login'
  }
})

export default router
