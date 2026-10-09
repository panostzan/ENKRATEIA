export async function request(type, data={}) {
  const response=await chrome.runtime.sendMessage({type,...data});
  if(response?.error)throw Error(response.error);return response;
}
export function clock(ms){const s=Math.floor(Math.max(0,ms)/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].filter((_,i)=>i||s>=3600).map(n=>String(n).padStart(2,'0')).join(':');}
export function duration(ms){if(ms<60000)return `${Math.floor(ms/1000)}s`;const min=Math.floor(ms/60000);return min>=60?`${Math.floor(min/60)}h ${min%60}m`:`${min}m ${Math.floor(ms/1000)%60}s`;}
export function error(e){document.querySelector('#error').textContent=e.message||String(e);}
export function domain(url){try{return new URL(url).hostname||new URL(url).protocol.replace(':','');}catch{return 'Tab';}}
