import { create } from 'zustand'
import type { QueuedText } from '../types'
import * as storage from '../services/storage'

interface OfflineQueueState {
  queue: QueuedText[]
  loading: boolean
  loadQueue: () => Promise<void>
  addToQueue: (qt: QueuedText) => Promise<void>
  consumeFromQueue: () => Promise<QueuedText | null>
}

export const useOfflineQueueStore = create<OfflineQueueState>()((set, get) => ({
  queue: [],
  loading: false,

  loadQueue: async () => {
    set({ loading: true })
    const queue = await storage.getAllQueuedTexts()
    set({ queue, loading: false })
  },

  addToQueue: async (qt) => {
    await storage.saveQueuedText(qt)
    set((state) => ({ queue: [...state.queue, qt] }))
  },

  consumeFromQueue: async () => {
    const queue = get().queue
    if (queue.length === 0) return null
    const item = queue[0]
    await storage.deleteQueuedText(item.id)
    set((state) => ({ queue: state.queue.filter((q) => q.id !== item.id) }))
    return item
  },
}))
