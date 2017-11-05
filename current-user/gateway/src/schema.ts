import { makeRemoteExecutableSchema, introspectSchema } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'
import { mergeSchemas } from 'graphql-tools'

import { createCurrentNodeQuery } from './currentNodeQuery'

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

  const { typeDefs, resolver } = createCurrentNodeQuery(graphcoolSchema, 'MyUser')

  const finalSchema = mergeSchemas({
    schemas: [schema, typeDefs],
    resolvers: mergeInfo => ({
      ...resolver(mergeInfo)
    })
  })

  return finalSchema
}