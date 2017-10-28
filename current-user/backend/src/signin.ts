import { fromEvent } from 'graphcool-lib'

export default async event => {
  
  console.log(event)

  const { name } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const createUserMutation = `
    mutation($name: String!) {
      createMyUser(name: $name) {
        id
      }
    }  
  `

  const result:any = await api.request(createUserMutation, { name })
  const id:string = result.createMyUser.id
  const token = await graphcool.generateNodeToken(id, "MyUser")
    
  return {
    data: {
      id,
      token
    }
  }
}