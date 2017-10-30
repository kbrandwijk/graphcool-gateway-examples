import { delegateHelper } from './helpers'

export default async (event) => {
  const query = `
  query {
    validateToken {
    nodeId
    typeName
    }
  }`
  
  return await delegateHelper(event.mergeInfo).fromQuery(query, {}, event.context, event.info)
}