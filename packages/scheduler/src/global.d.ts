interface Navigator {
  scheduling?: Scheduling
}

interface Scheduling {
  isInputPending: (options?: { includeContinuous: boolean }) => boolean
}
