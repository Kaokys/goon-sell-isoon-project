import { reportUX } from './lib/ux-metrics';
const initialPath=location.pathname;let lcp=0,cls=0;const observers:PerformanceObserver[]=[];
for(const type of ['largest-contentful-paint','layout-shift'])try{const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(type==='largest-contentful-paint')lcp=entry.startTime;else if(!(entry as any).hadRecentInput)cls+=(entry as any).value||0;}});observer.observe({type,buffered:true});observers.push(observer);}catch{}
let flushed=false;const flush=()=>{if(flushed)return;flushed=true;if(lcp)reportUX('lcp',Math.round(lcp),'',initialPath);reportUX('cls',Math.round(cls*10000)/10000,'',initialPath);const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;if(navigation)reportUX('navigation',Math.round(navigation.domContentLoadedEventEnd),'',initialPath);for(const observer of observers)observer.disconnect();};
window.addEventListener('pagehide',flush,{once:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
window.addEventListener('error',event=>reportUX('runtime_error',0,event.error instanceof Error?event.error.name:'ResourceError'));
window.addEventListener('unhandledrejection',event=>reportUX('runtime_error',0,event.reason instanceof Error?event.reason.name:'UnhandledRejection'));
