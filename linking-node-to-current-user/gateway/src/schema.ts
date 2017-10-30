import { makeRemoteExecutableSchema, introspectSchema, mergeSchemas } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'
import { transformSchema } from 'graphql-transform-schema'

import validateToken from './validateToken'

const endpoint = process.env.GRAPHCOOL_ENDPOINT

export const schema = async () => {
  // Set up graphql-request as fetcher with Authorization header
  const fetcher = endpoint => ({ query, variables, operationName, context }) => {
    let options;
    if (context && context.graphqlContext && context.graphqlContext.token) {
      options = { headers: { Authorization: context.graphqlContext.token } }
    }
    return new GraphQLClient(endpoint, options).request(query, variables).then(data => { return { data } })
  };

  // Create schema from remote endpoint
  const graphcoolEndpoint = endpoint
  const graphcoolLink = fetcher(graphcoolEndpoint)
  const graphcoolSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(graphcoolLink),
    fetcher: graphcoolLink,
  })

  /* 
  Ready for a game of Tower of Hanoi?
  We want to override the implementation of createPost.
  However, we can't do this directly.
  So we're going to follow these steps:
  - Create a mutation with a temporary name
  - Delegate that to the original mutation in our first mergeSchemas
  - Transform the resulting schema, removing the original mutation
  - Add the mutation again with the final (original) name
  - Delegate that to our temporary mutation in our second mergeSchemas
  - Finally, transform the schema again to remove our temporary mutation
  */
  const tempTypeDefs = `
  extend type Mutation {
    createUserPost(
      title: String!
      userId: ID): Post
  }`

  // Define the resolver for our temporary mutation
  const createPostResolver = mergeInfo => ({
    Mutation: {
      createUserPost: {
        async resolve(parent, args, context, info) {
          const event = { mergeInfo, parent, args, context, info}
          const auth = await validateToken(event)
          
          // Add userId to arguments, passed in userId will overwrite it
          const myArgs = auth != null ? { userId: auth.nodeId, ...args } : args

          return mergeInfo.delegate(
            'mutation', 'createPost', myArgs, context, info
          )
        }
      }
    }
  })

  // Merge the schemas
  const firstMergedSchema = mergeSchemas({
    schemas: [graphcoolSchema, tempTypeDefs],
    resolvers: mergeInfo => ({
      ...createPostResolver(mergeInfo),
    }),
  })
  
  // Remove the original mutation (delegate will still work)
  const transformedSchema = transformSchema(firstMergedSchema, {
    Mutation: {
      createPost: false
    }
  })

  // Add the mutation again, with the desired name
  const renamedTypeDefs = `
  extend type Mutation {
    createPost(
      title: String!
      userId: ID): Post
  }`

  // Merge the schemas, delegating to our temporary mutation
  const secondMergedSchema = mergeSchemas({
    schemas: [transformedSchema, renamedTypeDefs],
    resolvers: mergeInfo => ({
      Mutation: {
        createPost: {
          async resolve(parent, args, context, info) {
            return mergeInfo.delegate(
              'mutation', 'createUserPost', args, context, info
            )
          }
        }
      }
    }),
  })

  // Remove the temporary mutation (delegate will still work)
  const finalSchema = transformSchema(secondMergedSchema, {
    Mutation: {
      createUserPost: false
    }
  })

  return finalSchema
}
