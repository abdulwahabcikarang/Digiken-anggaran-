const https = require("https");

const data = JSON.stringify({
  sender: "6285695338505",
  message: "Kopi 6000"
});

const options = {
  hostname: "ais-dev-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app",
  port: 443,
  path: "/",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS (ais-dev): ${res.statusCode}`);
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk.toString()}`);
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

const optionsPre = {
  hostname: "ais-pre-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app",
  port: 443,
  path: "/",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const reqPre = https.request(optionsPre, (res) => {
  console.log(`STATUS (ais-pre): ${res.statusCode}`);
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk.toString()}`);
  });
});

reqPre.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

reqPre.write(data);
reqPre.end();
