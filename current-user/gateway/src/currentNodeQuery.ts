import { GraphQLSchema, GraphQLResolveInfo } from 'graphql'
import { lowerFirst } from 'lodash'
import { mergeSchemas } from 'graphql-tools'
import { delegateHelper } from './delegateHelper'

export function addCurrentNodeQuery(schema: GraphQLSchema, tokenNodeType): GraphQLSchema {
  // The new query name starts with lowercase
  const newQueryName: string = lowerFirst(tokenNodeType)

  // Check if the query already exists (for example, for the User Type)
  const fieldExists: boolean = schema.getQueryType().getFields()[newQueryName] !== undefined

  let finalSchema: GraphQLSchema = schema
  if (!fieldExists) {

    // Add the new query to the Query type
    const currentNodeTypeDefs = `
      extend type Query {
        ${newQueryName}: ${tokenNodeType}
      }`

    // Merge the new query into the type, specifying the resolver
    finalSchema = mergeSchemas({
      schemas: [schema, currentNodeTypeDefs],
      resolvers: mergeInfo => ({
        Query: {
          [newQueryName]: {
            async resolve(parent, args, context, info) {
              return await currentNodeResolver(tokenNodeType)(mergeInfo, parent, args, context, info)
            }
          }
        }
      })
    })
  }

  return finalSchema
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