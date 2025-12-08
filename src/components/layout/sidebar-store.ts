'use client'

import { create } from 'zustand'
import type { SidebarCollection } from '@/data/docs'
import { sidebarCollections as defaultCollections } from '@/data/docs'

interface SidebarCollectionsState {
  collections: Array<SidebarCollection>
  setCollections: (collections: Array<SidebarCollection>) => void
}

export const useSidebarCollectionsStore = create<SidebarCollectionsState>((set) => ({
  collections: defaultCollections,
  setCollections: (collections) => set({ collections }),
}))

