import { Container } from 'hostConfig'
import { Props } from 'shared/ReactTypes'

export const elementPropsKey = '__props'

const validEventTypeList = ['click']

interface SyntheticEvent extends Event {
  __stopPropagation: boolean
}

type EventCallback = (e: Event) => void
type EventCallbackNameList = [string, string]

interface EventTypeMap {
  [EventType: string]: EventCallbackNameList
}

interface CollectedEvents {
  capture: EventCallback[]
  bubble: EventCallback[]
}

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

export const updateFiberProps = (node: DOMElement, props: Props) => {
  node[elementPropsKey] = props
}

export const initEvent = (container: Container, eventType: string) => {
  if (!validEventTypeList.includes(eventType)) {
    console.warn('unrealized', eventType, 'event')
    return
  }
  if (__DEV__) {
    console.warn('init event', eventType)
  }
  container.addEventListener(eventType, (e: Event) => {
    dispatchEvent(container, eventType, e)
  })
}

function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent
  syntheticEvent.__stopPropagation = false
  const originStopPropagation = e.stopPropagation

  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true
    if (originStopPropagation) {
      originStopPropagation()
    }
  }
  return syntheticEvent
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target
  if (targetElement === null) {
    console.warn('event unexsisting', e)
    return
  }

  // 1. collect events
  const { capture, bubble } = collectEvents(
    container,
    targetElement as DOMElement,
    eventType
  )
  // 2. contribute syntheticEvent
  const se = createSyntheticEvent(e)
  // 3. travel capture
  triggerEventFlow(capture, se)
  if (!se.__stopPropagation) {
    // 4. travel bubble
    triggerEventFlow(bubble, se)
  }
}

function triggerEventFlow(eventFlow: EventCallback[], se: SyntheticEvent) {
  for (const callback of eventFlow) {
    callback.call(null, se)
    if (se.__stopPropagation) {
      break
    }
  }
}

function collectEvents(
  container: Container,
  targetElement: DOMElement,
  eventType: string
): CollectedEvents {
  const collectedEvents: CollectedEvents = {
    capture: [],
    bubble: [],
  }
  while (targetElement && targetElement !== container) {
    const elementProps = targetElement[elementPropsKey]
    // click -> ['onClickCapture', 'onClick']
    const callbackNameList = getEventCallbackNameListFromEventType(eventType)
    if (callbackNameList) {
      callbackNameList.forEach((callbackName, i) => {
        const eventCallBack = elementProps[callbackName]
        if (eventCallBack) {
          i === 0
            ? collectedEvents.capture.unshift(eventCallBack)
            : collectedEvents.bubble.push(eventCallBack)
        }
      })
    }
    targetElement = targetElement.parentNode as DOMElement
  }
  return collectedEvents
}

function getEventCallbackNameListFromEventType(
  eventType: string
): EventCallbackNameList | undefined {
  const eventTypeMap: EventTypeMap = {
    click: ['onClickCapture', 'onClick'],
  }
  return eventTypeMap[eventType]
}
