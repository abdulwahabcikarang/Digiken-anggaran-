const https = require("https");

const data = JSON.stringify({
  sender: "6285695338505",
  message: "Kopi 6000"
});

const options = {
  hostname: "digiken-anggaran.vercel.app",
  port: 443,
  path: "/api/webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk.toString()}`);
  });
});

req.on("error", (e) => {
  console.error(`error: ${e.message}`);
});

req.write(data);
req.end();
