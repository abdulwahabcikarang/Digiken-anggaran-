const https = require('https');
https.request("https://digiken-anggaran.vercel.app/api/webhook/", { method: "POST" }, (res) => {
  console.log(res.statusCode, res.headers);
}).end();
