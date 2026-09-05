import { spawn } from 'node:child_process';

const processes=[
  spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit'}),
  spawn(process.execPath,['scripts/worker.mjs'],{stdio:'inherit'}),
];
let stopping=false;
function stop(){if(stopping)return;stopping=true;for(const child of processes)child.kill('SIGTERM');}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
for(const child of processes){child.on('error',error=>{console.error(error.message);process.exitCode=1;stop();});child.on('exit',code=>{if(code)process.exitCode=code;stop();});}
