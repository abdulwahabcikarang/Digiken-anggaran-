const https = require("https");

function test(pathName) {
  const options = {
    hostname: "ais-dev-r35urhjjayy56eogfejv4d-809819681040.asia-southeast1.run.app",
    port: 443,
    path: pathName,
    method: "POST"
  };
  const req = https.request(options, (res) => {
    console.log(`STATUS (${pathName}): ${res.statusCode}`);
  });
  req.on("error", (e) => {
    console.error(`error: ${e.message}`);
  });
  req.end();
}

test("/webhook");
test("/api/fonnte");
