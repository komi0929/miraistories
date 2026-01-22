import { create } from 'zustand'

interface PokerFaceState {
    isPokerFaceMode: boolean
    togglePokerFaceMode: () => void
    setPokerFaceMode: (enabled: boolean) => void
}

export const usePokerFace = create<PokerFaceState>((set) => ({
    isPokerFaceMode: false,
    togglePokerFaceMode: () => set((state) => ({ isPokerFaceMode: !state.isPokerFaceMode })),
    setPokerFaceMode: (enabled) => set({ isPokerFaceMode: enabled }),
}))
