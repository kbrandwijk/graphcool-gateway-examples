import { makeRemoteExecutableSchema, introspectSchema, mergeSchemas } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'

import { delegateHelper } from './helpers'

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
  });

  // Extend the schema
  const extraTypeDefs = `
  extend type Query {
    myUser: MyUser
  }
  `;

  // Define the resolvers for each field
  const userResolver = mergeInfo => ({
    Query: {
      myUser: {
        async resolve(parent, args, context, info) {          
          const query = `
            query {
              validateToken {
                nodeId
                typeName
              }
            }`
          
          const auth = await delegateHelper(mergeInfo).fromQuery(query, {}, context, info)

          if (auth.typeName === 'MyUser') {
            return mergeInfo.delegate(
              'query', 'MyUser', { id: auth.nodeId }, context, info
            )
          }
          
          return null
        }
      }
    }
  })

  return mergeSchemas({
    schemas: [graphcoolSchema, extraTypeDefs],
    resolvers: mergeInfo => ({
      ...userResolver(mergeInfo),
    }),
  }); 
}