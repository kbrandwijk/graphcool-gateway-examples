import { fromEvent } from 'graphcool-lib'

export default async event => {
  const { name } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const createMyUserMutation = `
    mutation($name: String!) {
      createMyUser(name: $name) {
        id
      }
    }`

  const result:any = await api.request(createMyUserMutation, { name })
  const id:string = result.createMyUser.id
  const token = await graphcool.generateNodeToken(id, "MyUser")
    
  return {
    data: {
      id,
      token
    }
  }
}