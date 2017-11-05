import { GraphQLSchema, GraphQLResolveInfo } from 'graphql'
import { lowerFirst } from 'lodash'
import { delegateHelper } from './delegateHelper'

export function createCurrentNodeQuery(schema: GraphQLSchema, tokenNodeType): { typeDefs?, resolver? } {
  // The new query name starts with lowercase
  const newQueryName: string = lowerFirst(tokenNodeType)

  // Check if the query already exists (for example, for the User Type)
  const queryExists: boolean = schema.getQueryType().getFields()[tokenNodeType] !== undefined
  const newQueryExists: boolean = schema.getQueryType().getFields()[newQueryName] !== undefined
  
  if (queryExists && !newQueryExists) {
    // Add the new query to the Query type
    const typeDefs = `
      extend type Query {
        ${newQueryName}: ${tokenNodeType}
      }`

    const resolver = mergeInfo => ({
      Query: {
        [newQueryName]: {
          async resolve(parent, args, context, info) {
            return await currentNodeResolver(tokenNodeType)(mergeInfo, parent, args, context, info)
          }
        }
      }
    })

    return { typeDefs , resolver }
  }

  throw new Error(`Query '${tokenNodeType}' not found, or query '${newQueryName}' already exists`)
}

// Implementation of the resolver function
const currentNodeResolver = nodeType => async (mergeInfo: any, parent, args, context, info: GraphQLResolveInfo) => {
  // Query to validate the token
  const query = `
    query {
        validateToken {
        nodeId
        typeName
        }
    }`

  // Execute the query
  const auth = await delegateHelper(mergeInfo).fromQuery(query, {}, context, info)

  // If the typeName from the token matches the typeName for this query, delegate...
  if (auth.typeName === nodeType) {
    return mergeInfo.delegate(
      'query', nodeType, { id: auth.nodeId }, context, info
    )
  }

  // ...otherwise, return null (default Graphcool behavior for missing/invalid token)
  return null
}