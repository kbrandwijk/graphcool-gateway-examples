require('dotenv').config()

import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import { graphqlExpress } from 'apollo-server-express'
import { makeRemoteExecutableSchema, introspectSchema, mergeSchemas } from 'graphql-tools'
import gql from 'graphql-tag'
import { express as playground } from 'graphql-playground/middleware'
import { GraphQLClient } from 'graphql-request'

import { delegateHelper } from './helpers'

async function run() {

  const fetcher = endpoint => ({ query, variables, operationName, context }) => {
    let options;
    if (context && context.graphqlContext && context.graphqlContext.token) {
      console.log('using token')
      options = { headers: { Authorization: context.graphqlContext.token } }
    }
    return new GraphQLClient(endpoint, options).request(query, variables).then(data => { return { data } })
  };

  // Create schemas from remote endpoints
  const graphcoolEndpoint = process.env.GRAPHCOOL_ENDPOINT
  const graphcoolLink = fetcher(graphcoolEndpoint)
  const graphcoolSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(graphcoolLink),
    fetcher: graphcoolLink,
  });

  // Extend the schemas to link them together
  const extraTypeDefs = `
  extend type Query {
    myUser: MyUser
  }
  `;

  const userResolver = mergeInfo => ({
    Query: {
      myUser: {
        async resolve(parent, args, context, info) {          
          const query = gql`
            query {
              validateToken {
                nodeId
                typeName
              }
            }
          `
          
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

  const schema = mergeSchemas({
    schemas: [graphcoolSchema, extraTypeDefs],
    resolvers: mergeInfo => ({
      ...userResolver(mergeInfo),
    }),
  });

  const buildOptions = (req, res) => {
    return { 
      context: { token: req.headers.authorization },
      schema 
    }
  }

  const app = express()
  app.use('/graphql', cors(), bodyParser.json(), graphqlExpress(buildOptions))
  app.use('/playground', playground({ endpoint: '/graphql' }))

  app.listen(3000, () => console.log('Server running. Open http://localhost:3000/playground to run queries.'))
}

run().catch(console.error.bind(console))
