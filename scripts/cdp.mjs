#!/usr/bin/env node
/** Reusable CLI for the web-access skill's local CDP Proxy. Requires Node 22+. */
const BASE = (process.env.CDP_PROXY_URL || 'http://127.0.0.1:3456').replace(/\/$/, '');
const [, , command, ...args] = process.argv;

function usage() {
  console.error(`Usage: node cdp.mjs <command> [args]\n\nCommands:\n  health\n  targets\n  open <url>\n  info <target>\n  title <target>\n  screenshot <target> <file>\n  dom <target> [css-selector]\n  eval <target> <javascript-expression>\n  instrument <target>\n  errors <target>\n  network <target>\n  click <target> <css-selector>\n  fill <target> <css-selector> <value>\n  select <target> <css-selector> <value>\n  check <target> <css-selector> [true|false]\n  submit <target> <css-selector>\n  navigate <target> <url>\n  back <target>\n  scroll <target> <top|bottom|up|down|pixels>\n  close <target>\n\nSet CDP_PROXY_URL to override http://127.0.0.1:3456.`);
}

async function request(path, { method = 'GET', body, json = false } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': json ? 'application/json' : 'text/plain;charset=UTF-8' },
      body: body === undefined ? undefined : (json ? JSON.stringify(body) : body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new Error(`CDP Proxy unavailable at ${BASE}: ${error.message}. Verify Chrome remote debugging and Proxy availability.`);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`Proxy ${response.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

const q = (name, value) => `?${name}=${encodeURIComponent(value)}`;
const targetPath = (endpoint, target, extra = '') => `/${endpoint}?target=${encodeURIComponent(target)}${extra}`;
const js = async (target, expression) => request(targetPath('eval', target), { method: 'POST', body: expression });
const need = (n, hint) => { if (args.length < n) { usage(); throw new Error(`Missing arguments: ${hint}`); } };

try {
  let result;
  switch (command) {
    case 'help': case '--help': case '-h': usage(); process.exit(0); break;
    case 'health': result = await request('/health'); break;
    case 'targets': result = await request('/targets'); break;
    case 'open': need(1, 'url'); result = await request(`/new${q('url', args[0])}`); break;
    case 'info': need(1, 'target'); result = await request(targetPath('info', args[0])); break;
    case 'title': need(1, 'target'); result = await js(args[0], 'document.title'); break;
    case 'screenshot':
      need(2, 'target file');
      result = await request(targetPath('screenshot', args[0], `&file=${encodeURIComponent(args[1])}`));
      break;
    case 'dom': {
      need(1, 'target');
      const selector = args[1] || 'body';
      const expression = `(() => { const root=document.querySelector(${JSON.stringify(selector)}); if(!root) return {error:'No matching element',selector:${JSON.stringify(selector)}}; return {title:document.title,url:location.href,selector:${JSON.stringify(selector)},text:(root.innerText||'').slice(0,12000),html:root.outerHTML.slice(0,20000),elements:[...root.querySelectorAll('a,button,input,select,textarea,[role], [data-testid]')].slice(0,150).map(e=>({tag:e.tagName,role:e.getAttribute('role'),text:(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().slice(0,200),type:e.type||null,name:e.name||null,placeholder:e.placeholder||null,href:e.href||null,disabled:!!e.disabled,selector:e.id?'#'+e.id:(e.getAttribute('data-testid')?'[data-testid=\\"'+e.getAttribute('data-testid')+'\\"]':null)}))}; })()`;
      result = await js(args[0], expression); break;
    }
    case 'eval': need(2, 'target javascript-expression'); result = await js(args[0], args.slice(1).join(' ')); break;
    case 'instrument': {
      need(1, 'target');
      result = await js(args[0], `(() => { if(window.__dshAuto) return {installed:true,already:true}; const s=window.__dshAuto={errors:[],requests:[]}; const put=(a,v)=>{a.push(v);if(a.length>300)a.shift()}; const scrub=u=>{try{const x=new URL(u,location.href);return x.origin+x.pathname}catch{return String(u).split('?')[0]}}; const oldError=console.error.bind(console); console.error=(...a)=>{put(s.errors,{kind:'console.error',time:new Date().toISOString(),message:a.map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)}catch{return String(x)}}).join(' ').slice(0,3000)});oldError(...a)}; addEventListener('error',e=>put(s.errors,{kind:'error',time:new Date().toISOString(),message:e.message,source:e.filename,line:e.lineno,column:e.colno})); addEventListener('unhandledrejection',e=>put(s.errors,{kind:'unhandledrejection',time:new Date().toISOString(),message:String(e.reason?.stack||e.reason).slice(0,3000)})); const of=window.fetch;window.fetch=async function(input,init={}){const u=typeof input==='string'?input:input.url,method=init.method||input?.method||'GET',t=performance.now();try{const r=await of.apply(this,arguments);put(s.requests,{kind:'fetch',time:new Date().toISOString(),method,url:scrub(u),status:r.status,durationMs:Math.round(performance.now()-t)});return r}catch(e){put(s.requests,{kind:'fetch',time:new Date().toISOString(),method,url:scrub(u),error:String(e),durationMs:Math.round(performance.now()-t)});throw e}}; const xo=XMLHttpRequest.prototype.open, xs=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u){this.__dshReq={method:m,url:scrub(u)};return xo.apply(this,arguments)};XMLHttpRequest.prototype.send=function(){const x=this,t=performance.now();x.addEventListener('loadend',()=>put(s.requests,{kind:'xhr',time:new Date().toISOString(),method:x.__dshReq?.method,url:x.__dshReq?.url,status:x.status,durationMs:Math.round(performance.now()-t)}),{once:true});return xs.apply(this,arguments)};return {installed:true,note:'Captures subsequent console errors, uncaught errors, unhandled rejections, fetch/XHR metadata only. No request/response bodies or headers.'} })()`);
      break;
    }
    case 'errors': need(1, 'target'); result = await js(args[0], 'window.__dshAuto?.errors || {installed:false,note:"Run instrument first; events before installation are unavailable."}'); break;
    case 'network': need(1, 'target'); result = await js(args[0], 'window.__dshAuto?.requests || {installed:false,note:"Run instrument first; only subsequent fetch/XHR metadata is captured."}'); break;
    case 'click': need(2, 'target css-selector'); result = await request(targetPath('click', args[0]), { method: 'POST', body: args[1] }); break;
    case 'fill':
    case 'select': {
      need(3, 'target css-selector value');
      const [target, selector, value] = args;
      result = await js(target, `(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)return {error:'No matching element',selector:${JSON.stringify(selector)}};e.focus();const v=${JSON.stringify(value)};if(e.tagName==='SELECT'){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true,value:e.value}};const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const d=Object.getOwnPropertyDescriptor(p,'value');if(d?.set)d.set.call(e,v);else e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true,value:e.value}})()`);
      break;
    }
    case 'check': {
      need(2, 'target css-selector [true|false]');
      const [target, selector, state = 'true'] = args;
      result = await js(target, `(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)return {error:'No matching element'};e.checked=${state !== 'false'};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true,checked:e.checked}})()`);
      break;
    }
    case 'submit': need(2, 'target css-selector'); result = await js(args[0], `(() => {const e=document.querySelector(${JSON.stringify(args[1])});if(!e)return {error:'No matching element'};const f=e.matches('form')?e:e.closest('form');if(!f)return {error:'Element is not in a form'};f.requestSubmit();return {ok:true}})()`); break;
    case 'navigate': need(2, 'target url'); result = await request(targetPath('navigate', args[0], `&url=${encodeURIComponent(args[1])}`)); break;
    case 'back': need(1, 'target'); result = await request(targetPath('back', args[0])); break;
    case 'scroll': {
      need(2, 'target top|bottom|up|down|pixels');
      const [target, value] = args;
      if (['top','bottom','up','down'].includes(value)) result = await request(targetPath('scroll', target, `&direction=${encodeURIComponent(value)}`));
      else { const pixels = Number(value); if (!Number.isFinite(pixels)) throw new Error('scroll pixels must be a number or top/bottom/up/down'); result = await request(targetPath('scroll', target, `&y=${encodeURIComponent(pixels)}`)); }
      break;
    }
    case 'close': need(1, 'target'); result = await request(targetPath('close', args[0])); break;
    default: usage(); throw new Error(`Unknown command: ${command || '(none)'}`);
  }
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
