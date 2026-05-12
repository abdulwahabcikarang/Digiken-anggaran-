const https = require("https");
const data = "sender=123&message=halo";
const options = {
  hostname: "digiken-anggaran.vercel.app",
  port: 443,
  path: "/api/webhook",
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(data) }
};
const req = https.request(options, res => {
  res.on("data", chunk => console.log(chunk.toString()));
});
req.write(data);
req.end();
