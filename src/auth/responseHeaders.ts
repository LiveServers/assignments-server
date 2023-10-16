type ResponseHeaders = {
    statusCode: string,
    customerMessage: string,
}
export default function responseHeaders(headers:ResponseHeaders){
    return {
       ...headers,
       timeLogged: new Date()
    }
}