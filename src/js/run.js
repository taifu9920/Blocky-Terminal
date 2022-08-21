let http = require('http');
let fs = require('fs');
let port = 8080;

const server = http.createServer((req, res) => {
	let ip = req.headers['x-forwarded-for'];
	if (!ip) ip = req.socket.remoteAddress;
	console.log(ip, "-", req.url);
	
	if(req.url=='/'){
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		fs.readFile('./src/index.html', null, function (error, data) {
			if (error) {
				res.writeHead(404);
				res.write('Whoops! File not found!');
			} else {
				res.write(data);
			}
			res.end();
		});
	} else if (req.url.startsWith("/css/")){
		res.writeHead(200, {
			'Content-Type': 'text/css'
		});
		fs.readFile('./src/static/' + req.url.substring("/css/".length), null, function (error, data) {
			if (error) {
				res.writeHead(404);
				res.write('Whoops! File not found!');
			} else {
				res.write(data);
			}
			res.end();
		});
	}else{
            res.end('Invalid Request!');
}});

server.listen(port, () => {
    console.log(`Server is listening on port number: ${port}`);
});