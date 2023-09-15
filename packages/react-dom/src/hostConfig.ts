export type Container = Element
export type Instance = Element

//createInstance: (type: string, props: any) => Instance
export const createInstance = (type: string, props: any): Instance => {
  // TODO deal with props
  const element = document.createElement(type)

  return element
}

export const createTextInstance = (content: string): Text => {
  return document.createTextNode(content)
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.appendChild(child)
}

export const appendChildToContainer = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.appendChild(child)
}
