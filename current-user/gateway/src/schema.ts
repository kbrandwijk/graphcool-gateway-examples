import { makeRemoteExecutableSchema, introspectSchema } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'
import { addCurrentNodeQuery } from './currentNodeQuery'

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

  const schema = addCurrentNodeQuery(graphcoolSchema, 'MyUser')

  return schema
}