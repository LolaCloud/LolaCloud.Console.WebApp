import { create } from 'zustand'
import type { Operator } from '../types/operator'
import type { Nullable } from '@/lib/utils'

type StoreFunctions = {
    setCurrentOperator: (op: Operator) => void,
}

type StoreValues = {
    currentOperator: Nullable<Operator>
}

type Store = StoreValues & StoreFunctions

export const useOperator = create<Store>(set => ({
    setCurrentOperator: (operator) => set({currentOperator: operator}),
    currentOperator: null
}))