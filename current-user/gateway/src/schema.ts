import { makeRemoteExecutableSchema, introspectSchema, mergeSchemas } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'

import myUser from './myUser'

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
          const event = { mergeInfo, parent, args, context, info}
          return await myUser(event)

          
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