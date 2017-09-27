import flatten from "lodash/flatten"

export const isVendorExt = (state,node) => node.path.some(a => a.indexOf("x-") === 0)
export const isDefinition = (state,node) => node.path[0] == "definitions" && node.path.length == 2
export const isRootParameter = (state, node) => node.path[0] === "parameters" && node.path.length === 2
export const isRootResponse = (state, node) => node.path[0] === "responses" && node.path.length === 2
export const isRootHeader = (state, node) => node.path[0] === "headers" && node.path.length === 2
export const isRef = (state, node) => node.key === "$ref" && typeof node.node === "string" // This selector can be fooled.

export const isSubSchema = (state, node) => (sys) => {
  const path = node.path
  if(path.length < 3) {
    return false
  }

  if(node.parent.key == "properties" || node.parent.key === "additionalProperties") {
    if(node.parent.parent && node.parent.parent.node && node.parent.parent.node.type === "object") {
      return !sys.validateSelectors.isVendorExt(node)
    }
  } else if(node.key == "items") {
    if(node.parent.node && node.parent.node.type === "array") {
      return !sys.validateSelectors.isVendorExt(node)
    }
  }
}

export const isParameter = (state, node) => (sys) => {
  if(sys.validateSelectors.isVendorExt(node)) {
    return false
  }
  return (
    sys.validateSelectors.isRootParameter(node)
      || ( node.path[0] === "paths"
           && node.path[3] === "parameters"
           && node.path.length === 5)
  )
}

export const isParameterSchema = (state, node) => (sys) => {
  // parameter.x.in != body
  if(sys.validateSelectors.isParameter(node) && node.node.in !== "body") {
    return true
  }
  // parameter.x.in == body
  if(node.key === "schema" && node.parent && sys.validateSelectors.isParameter(node.parent) && node.parent.node.in === "body") {
    return true
  }
}

export const isResponse = (state, node) => (sys) => {
  if(sys.validateSelectors.isVendorExt(node)) {
    return false
  }
  return (
    sys.validateSelectors.isRootResponse(node)
      || ( node.path[0] === "paths"
           && node.path[3] === "responses"
           && node.path.length === 5)
  )
}

export const isHeader = (state, node) => (sys) => {
  if(sys.validateSelectors.isVendorExt(node)) {
    return false
  }
  return (
    sys.validateSelectors.isRootHeader(node)
      || ( node.path[0] === "paths"
           && node.path[3] === "responses"
           && node.path[5] === "headers"
           && node.path.length === 7)
  )
}

export const isResponseSchema = (state, node) => (sys) => {
  // paths.<operation>.<method>.responses.XXX.schema
  // respones.<response>.schema
  if(node.key === "schema" && node.parent && sys.validateSelectors.isResponse(node.parent)) {
    return true
  }
}

export const allSchemas = () => (system) => {
  const schemaSources = [
    "allParameterSchemas",
    "allResponseSchemas",
    "allDefinitions",
    "allHeaders",
    "allSubSchemas",
  ]

  const selectors = schemaSources.map(name => system.validateSelectors[name]())

  return Promise.all(selectors)
    .then((schemasAr) => {
      return flatten(schemasAr)
    })
}

export const allParameters = () => (system) => {
  return system.fn.traverseOnce({
    name: "allParameterSchemas",
    fn: (node) => {
      if(system.validateSelectors.isParameter(node)) {
        return node
      }
    },
  })
}

export const allSubSchemas = () => (system) => {
  return system.fn.traverseOnce({
    name: "allSubSchemas",
    fn: (node) => {
      if(system.validateSelectors.isSubSchema(node)) {
        return node
      }
    },
  })
}

export const all$refs = () => (system) => {
  return system.fn.traverseOnce({
    name: "all$refs",
    fn: (node) => {
      if(system.validateSelectors.isRef(node)) {
        return node
      }
    },
  })
}

export const allDefinitions = () => (system) => {
  return system.fn.traverseOnce({
    name: "allDefinitions",
    fn: (node) => {
      if(system.validateSelectors.isDefinition(node)) {
        return node
      }
    },
  })
}

export const allParameterSchemas = () => (system) => {
  return system.fn.traverseOnce({
    name: "allParameterSchemas",
    fn: (node) => {
      if(system.validateSelectors.isParameterSchema(node)) {
        return node
      }
    },
  })
}

export const allHeaders = () => (system) => {
  return system.fn.traverseOnce({
    name: "allHeader",
    fn: (node) => {
      if(system.validateSelectors.isHeader(node)) {
        return node
      }
    },
  })
}

export const allResponseSchemas = () => (system) => {
  return system.fn.traverseOnce({
    name: "allResponseSchemas",
    fn: (node) => {
      if(system.validateSelectors.isResponseSchema(node)) {
        return node
      }
    },
  })
}

export const allOperations = () => (system) => {
  return system.fn.traverseOnce({
    name: "allOperations",
    fn: (node) => {
      const isOperation = (
        node.path[0] == "paths"
          && node.path.length === 3
          && !system.validateSelectors.isVendorExt(node.key)
      )

      if(isOperation) {
        return node
      }
    }
  })
}
