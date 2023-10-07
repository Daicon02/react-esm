export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5

export const NoPriority = 0
export const ImmediatePriority = 1
export const NormalPriority = 3
export const IdlePriority = 5

export const IMMEDIATE_PRIORITY_TIMEOUT = -1
export const NORMAL_PRIORITY_TIMEOUT = 5000
export const IDEL_PRIORITY_TIMEOUT = Number.MAX_SAFE_INTEGER
