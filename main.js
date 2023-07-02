const http=require('http');
require('dotenv').configDotenv();

const HOST = process.env.HOST;
const PORT = process.env.PORT;

console.log(HOST);
console.log(PORT);

const server=http.createServer((request,response)=>{
    response.writeHead(200, {'Content_Type':'text/plain'})
    response.end('successfully connected.')
});

server.listen(PORT, HOST, () => {
    console.log(`started on ${HOST}:${PORT}`)
})