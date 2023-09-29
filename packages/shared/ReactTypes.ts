export type Type = any
export type Key = any
export type Ref = any
export type Props = any
export type ElementType = any

export interface ReactElementType {
  $$typeof: symbol | number
  type: ElementType
  key: Key
  props: Props
  ref: Ref
  __mark: string
}

export type ReactNode = ReactElementType | ReactFragment | ReactText

export type ReactEmpty = null | void | boolean

export type ReactFragment = ReactEmpty | ReactNode[]

export type ReactText = string | number

export type Action<State> = State | ((prevState: State) => State)
