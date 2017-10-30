import { delegateHelper } from './helpers'

export default async (event) => {
  const query = `
  query {
    validateToken {
    nodeId
    typeName
    }
  }`
  
  const auth = await delegateHelper(event.mergeInfo).fromQuery(query, {}, event.context, event.info)

  if (auth.typeName === 'MyUser') {
    return event.mergeInfo.delegate(
      'query', 'MyUser', { id: auth.nodeId }, event.context, event.info
    )
  }
  
  return null
}