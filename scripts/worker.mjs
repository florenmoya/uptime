import {spawn} from 'node:child_process';

let stopping=false,child,timer;
function start(){
  child=spawn(process.execPath,['--import','tsx','src/worker.ts'],{stdio:'inherit',windowsHide:true});
  child.on('error',()=>{console.error('Unable to start the uptime worker.');process.exitCode=1;});
  child.on('exit',code=>{
    if(stopping)return;
    if(code===0||code===2){process.exitCode=code;return;}
    console.error('Worker stopped unexpectedly. Restarting in five seconds.');
    timer=setTimeout(start,5000);
  });
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
  stopping=true;clearTimeout(timer);child?.kill('SIGTERM');
});
start();
