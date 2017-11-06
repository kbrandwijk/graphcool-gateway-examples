import { makeRemoteExecutableSchema, introspectSchema, mergeSchemas } from 'graphql-tools'
import { GraphQLClient } from 'graphql-request'

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

  
  const additionalTypeDefs = `
    interface ContentElement {
      position: Int
    }
    extend type Image implements ContentElement {}
    extend type TextBlock implements ContentElement {}

    extend type Page {
      contentElements: [ContentElement]
    }`
  
  
  // Define the resolvers for each field
  const contentElementsResolver = mergeInfo => ({
    Page: {
      contentElements: {
        fragment: `fragment PageFragment on Page { id }`,
        async resolve(parent, args, context, info) {
          // Temporary workaround to add __typename to the fields
          // Because it is not added automatically, and needed to
          // be able to resolve the interface
          const field = 
  					{ kind: 'Field', name: { kind: 'Name', value: '__typename' } }
          
          const newInfo = JSON.parse(JSON.stringify(info));
          newInfo.fieldNodes[0].selectionSet.selections.push(field)
          
          const id = parent.id;
          // Delegate to all the implementations of the interface
          const images = await mergeInfo.delegate(
            'query', 'allImages', { filter: { page: { id } } }, context, newInfo
          )
          const textBlocks = await mergeInfo.delegate(
            'query', 'allTextBlocks', { filter: { page: { id } } }, context, newInfo
          )
        
          return [...images, ...textBlocks]
        }
      }
    }
  })

  const schema = mergeSchemas({
    schemas: [graphcoolSchema, additionalTypeDefs],
    resolvers: mergeInfo => ({
      ...contentElementsResolver(mergeInfo),
    }),
  });

  return schema
}