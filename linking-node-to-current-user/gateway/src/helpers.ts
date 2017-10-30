import { DocumentNode, GraphQLResolveInfo, OperationDefinitionNode, parse, FieldNode } from 'graphql'

/*
mergeInfo.delegate only allows you to pass in an operationName and variables.
It does not allow you to define query fields, because they are inferred from the user query.
If you need to delegate a query that is unrelated to the user query, you need to provide
the fields you need. This helper does that, based on a provided query.
 */
export const delegateHelper = mergeInfo => ({
    fromQuery: async (
        query: string, 
        args: { [key: string]: any }, 
        context: { [key: string]: any }, 
        info: GraphQLResolveInfo) => {
            const document: DocumentNode = parse(query)

            const operationDefinition: OperationDefinitionNode = document.definitions[0] as OperationDefinitionNode
            const operationType:string = operationDefinition.operation
            const operationName:string = (operationDefinition.selectionSet.selections[0] as any).name.value
            const fields: [FieldNode] = (operationDefinition.selectionSet.selections[0] as any).selectionSet.selections
  
            console.log(fields)

            const newInfo: GraphQLResolveInfo = JSON.parse(JSON.stringify(info));
            console.log(newInfo.fieldNodes[0])
            newInfo.fieldNodes[0].selectionSet!.selections = fields
  
            return await mergeInfo.delegate(
              operationType, operationName, { }, context, newInfo
            )
    }
})