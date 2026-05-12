const https = require("https");

const options = {
  hostname: "digiken-anggaran.vercel.app",
  port: 443,
  path: "/api/webhook",
  method: "POST"
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk.toString()}`);
  });
});

req.on("error", (e) => {
  console.error(`error: ${e.message}`);
});

req.end();
