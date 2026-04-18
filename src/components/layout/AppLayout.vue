<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useReview } from '@/composables/useReview'

const router = useRouter()
const { signOut } = useAuth()
const { query: reviewQuery } = useReview()

const reviewCount = computed(() => reviewQuery.data.value?.length ?? 0)

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Transactions', icon: 'i-lucide-list', to: '/transactions' },
  { label: 'Importer', icon: 'i-lucide-upload', to: '/import' },
  { label: 'Récurrents', icon: 'i-lucide-repeat', to: '/recurring' },
  { label: 'Catégories', icon: 'i-lucide-tag', to: '/categories' }
]

async function logout() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
    <!-- Sidebar -->
    <aside class="w-56 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <span class="text-lg font-bold text-primary">OnlyFlooze</span>
      </div>

      <nav class="flex-1 p-2 space-y-1">
        <!-- Entrée "À traiter" avec badge — toujours en premier si des transactions attendent -->
        <RouterLink to="/review" v-slot="{ isActive }" custom>
          <UButton
            :variant="isActive ? 'soft' : 'soft'"
            :color="isActive ? 'warning' : reviewCount > 0 ? 'warning' : 'neutral'"
            class="w-full justify-start"
            icon="i-lucide-inbox"
            :to="'/review'"
          >
            <span class="flex-1 text-left">À traiter</span>
            <UBadge
              v-if="reviewCount > 0"
              :label="String(reviewCount)"
              color="warning"
              size="xs"
              class="ml-1"
            />
          </UButton>
        </RouterLink>

        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          v-slot="{ isActive }"
          custom
        >
          <UButton
            :variant="isActive ? 'soft' : 'ghost'"
            :color="isActive ? 'primary' : 'neutral'"
            class="w-full justify-start"
            :icon="item.icon"
            :label="item.label"
            :to="item.to"
          />
        </RouterLink>
      </nav>

      <div class="p-2 border-t border-gray-200 dark:border-gray-800">
        <UButton
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          icon="i-lucide-log-out"
          label="Déconnexion"
          @click="logout"
        />
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto p-6">
      <slot />
    </main>
  </div>
</template>
