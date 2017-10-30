import { fromEvent } from 'graphcool-lib'

export default async event => {
  const { name } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const createUserMutation = `
    mutation($name: String!) {
      createUser(name: $name) {
        id
      }
    }`

  const result:any = await api.request(createUserMutation, { name })
  const id:string = result.createUser.id
  const token = await graphcool.generateNodeToken(id, "User")
    
  return {
    data: {
      id,
      token
    }
  }
}