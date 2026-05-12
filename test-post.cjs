const http = require("http");

const data = JSON.stringify({
  sender: "6285695338505",
  message: "Kopi 6000"
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk.toString()}`);
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
