// Standard gateway server file

require('dotenv').config()

import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import { graphqlExpress } from 'apollo-server-express'
import { expressPlayground } from 'graphql-playground-middleware'

import { schema } from './schema'

async function run() {

  const mySchema = await schema()

  const buildOptions = (req, res) => {
    // Put Authorization header from Express context into GraphqlContext
    return { 
        context: { token: req.headers.authorization },
        schema: mySchema 
    }
  }

  const app = express()
  app.use('/graphql', cors(), bodyParser.json(), graphqlExpress(buildOptions))
  app.use('/playground', expressPlayground({ endpoint: '/graphql' }))

  app.listen(3000, () => console.log('Server running. Open http://localhost:3000/playground to run queries.'))
}

run().catch(console.error.bind(console))
