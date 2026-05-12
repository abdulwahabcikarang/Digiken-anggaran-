const https = require("https");

const data = JSON.stringify({
  sender: "6285695338505",
  message: "Kopi 6000"
});

function test(host, pathName) {
  const options = {
    hostname: host,
    port: 443,
    path: pathName,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`STATUS (${host}${pathName}): ${res.statusCode}`);
    if (res.statusCode >= 300 && res.statusCode < 400) {
      console.log(`REDIRECT LOCATION: ${res.headers.location}`);
    }
  });

  req.on("error", (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

test("ais-dev-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app", "/api/webhook");
test("ais-dev-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app", "/api/webhook/");
test("ais-pre-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app", "/api/webhook");
test("ais-pre-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app", "/api/webhook/");
