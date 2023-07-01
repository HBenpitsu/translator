const http=require('http')
const hostname='localhost'
const port=3000
const server=http.createServer((request,response)=>{
    response.statusCode=200
    response.setHeader('Content-Type','text/plain')
    response.end('Helloworld')
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`)
})