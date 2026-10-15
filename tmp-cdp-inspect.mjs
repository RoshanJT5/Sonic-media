const tabs = await (await fetch('http://127.0.0.1:9224/json')).json();
const page = tabs.find(tab => tab.type === 'page');
const socket = new WebSocket(page.webSocketDebuggerUrl);
let commandId = 0;
const pending = new Map();
const events = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  } else if (message.method === 'Runtime.consoleAPICalled') {
    events.push({ method: message.method, args: message.params.args.map(arg => arg.value || arg.description) });
  } else if (message.method === 'Runtime.exceptionThrown') {
    events.push({ method: message.method, text: message.params.exceptionDetails.text, description: message.params.exceptionDetails.exception?.description });
  } else if (message.method === 'Network.loadingFailed') {
    events.push({ method: message.method, url: message.params.requestId, error: message.params.errorText });
  }
};
await new Promise(resolve => { socket.onopen = resolve; });
const call = (method, params = {}) => new Promise(resolve => {
  const id = ++commandId;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
await call('Runtime.enable');
await call('Network.enable');
await new Promise(resolve => setTimeout(resolve, 8000));
const expression = `({
  count: document.querySelectorAll('.sonic-milestone-item').length,
  ids: [...document.querySelectorAll('.sonic-milestone-item')].map(el => el.dataset.id),
  text: document.querySelector('#portfolio-timeline-count')?.textContent,
  cache: localStorage.getItem('tsm_supabase_cache')
})`;
const result = await call('Runtime.evaluate', { expression, returnByValue: true });
console.log(JSON.stringify(result.result.result.value));
console.log(JSON.stringify(events));
socket.close();
