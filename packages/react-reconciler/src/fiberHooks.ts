import ReactSharedInternals from 'shared/ReactSharedInternals'
import { FiberNode } from './fiber'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lanes, NoLanes, requestUpdateLane } from './fiberLane'
import { HookHasEffect, HookFlags, HookPassive } from './hookEffectTags'
import { Passive as PassiveEffect } from './fiberFlags'
import {
  Dispatch,
  Dispatcher,
  EffectCreate,
  EffectDeps,
} from 'shared/ReactInternalTypes'
// TODO: Implement a separate UpdateQueue for Hooks
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from './fiberUpdateQueue'
import { is } from 'shared/utils'

interface Hook {
  memorizedState: any
  updateQueue: UpdateQueue<any> | null
  next: Hook | null
}

interface EffectInstance {
  destroy: (() => void) | void
}

export interface Effect {
  tag: HookFlags
  create: EffectCreate
  inst: EffectInstance
  deps: EffectDeps
  next: Effect | null
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLanes: Lanes = NoLanes

const { currentDispatcher } = ReactSharedInternals

export const renderWithHooks = (wip: FiberNode, lanes: Lanes): any => {
  renderLanes = lanes
  // assignment currentlyRenderingFiber
  currentlyRenderingFiber = wip
  wip.memorizedState = null
  wip.updateQueue = null

  const current = wip.alternate
  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  // FC render
  const children = Component(props)

  // reset
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null

  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
}

// TODO actual hooks in useEffect
function updateEffect(create: EffectCreate, deps?: EffectDeps) {
  const hook = updateWorkInProgressHook()
  const effect = hook.memorizedState as Effect
  const nextDeps = deps === undefined ? null : deps
  const inst = effect.inst
  if (currentHook !== null) {
    const prevEffect = currentHook.memorizedState as Effect
    const prevDeps = prevEffect.deps
    if (nextDeps !== null) {
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memorizedState = pushEffect(HookPassive, create, inst, nextDeps)
        return
      }
    }
    ;(currentlyRenderingFiber as FiberNode).flags = PassiveEffect
    hook.memorizedState = pushEffect(
      HookPassive | HookHasEffect,
      create,
      inst,
      nextDeps
    )
  }
}

function areHookInputsEqual(
  nextDeps: EffectDeps,
  prevDeps: EffectDeps
): boolean {
  if (prevDeps === null || nextDeps === null) {
    return false
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (is(nextDeps[i], prevDeps[i])) {
      continue
    }
    return false
  }
  return true
}

function mountEffect(create: EffectCreate, deps?: EffectDeps) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
  hook.memorizedState = pushEffect(
    HookPassive | HookHasEffect,
    create,
    createEffectInstance(),
    nextDeps
  )
}

function createEffectInstance(): EffectInstance {
  const effectInstance: EffectInstance = { destroy: undefined }
  return effectInstance
}

function pushEffect(
  tag: HookFlags,
  create: EffectCreate,
  inst: EffectInstance,
  deps: EffectDeps
): Effect {
  const effect: Effect = {
    tag,
    create,
    inst,
    deps,
    next: null,
  }
  const fiber = currentlyRenderingFiber as FiberNode
  let componentUpdateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFCUpdateQueue()
    fiber.updateQueue = componentUpdateQueue
    effect.next = effect
    componentUpdateQueue.lastEffect = effect
  } else {
    const lastEffect = componentUpdateQueue.lastEffect
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect
    } else {
      effect.next = lastEffect.next
      lastEffect.next = effect
      componentUpdateQueue.lastEffect = effect
    }
  }
  return effect
}

const createFCUpdateQueue = <State>(): FCUpdateQueue<State> => {
  const componentUpdateQueue =
    createUpdateQueue<State>() as FCUpdateQueue<State>
  componentUpdateQueue.lastEffect = null
  return componentUpdateQueue
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // calculate new state
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending
  queue.shared.pending = null

  if (pending !== null) {
    const { memorizedState } = processUpdateQueue(
      hook.memorizedState,
      pending,
      renderLanes
    )
    hook.memorizedState = memorizedState
  }

  return [hook.memorizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
  // TODO update when FC rendering
  let nextCurrentHook: Hook | null

  if (currentHook === null) {
    // update && first hook
    const current = currentlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memorizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    // update && next hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    throw new Error(
      `FC ${currentlyRenderingFiber?.type} rendered more hooks than previous render`
    )
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memorizedState: currentHook.memorizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }
  // mount newHook
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('Please call hook in FC!')
    }
    workInProgressHook = newHook
    currentlyRenderingFiber.memorizedState = workInProgressHook
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = workInProgressHook.next
  }

  return workInProgressHook
}

function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()
  const memorizedState =
    initialState instanceof Function ? initialState() : initialState
  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue
  hook.memorizedState = memorizedState

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  queue.dispatch = dispatch
  return [memorizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memorizedState: null,
    updateQueue: null,
    next: null,
  }
  if (workInProgressHook === null) {
    // mount && first hook
    if (currentlyRenderingFiber === null) {
      // not call hook in FC
      throw new Error('Please call hook in FC!')
    }
    workInProgressHook = hook
    currentlyRenderingFiber.memorizedState = workInProgressHook
  } else {
    // mount && next hook
    workInProgressHook.next = hook
    workInProgressHook = workInProgressHook.next
  }
  return workInProgressHook
}
