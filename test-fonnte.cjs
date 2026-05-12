fetch("https://api.fonnte.com/send", {
  method: "POST",
  headers: { "Authorization": "invalid_token", "Content-Type": "application/json" },
  body: JSON.stringify({ target: "123", message: "test" })
}).then(r => r.json()).then(console.log).catch(console.error);
