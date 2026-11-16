// The agent controls Chrome; this helper only manages the local, resumable queue.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'linkedin.py');
const result=spawnSync('python',[script,...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
if(result.error){console.error(result.error.message);process.exit(1)}
process.exit(result.status??1);
